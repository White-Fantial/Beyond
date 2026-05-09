import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    connection: {
      findFirst: vi.fn(),
    },
    externalCatalogProduct: {
      findMany: vi.fn(),
    },
    menuImportProductMap: {
      findMany: vi.fn(),
      upsert: vi.fn(),
      update: vi.fn(),
    },
    menuImportRun: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    tenantCatalogProduct: {
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock("@/services/catalog-import.service", () => ({
  runFullCatalogImport: vi.fn(),
}));

vi.mock("@/lib/integrations/crypto", () => ({
  decryptJson: vi.fn(),
}));

import { prisma } from "@/lib/prisma";
import { decryptJson } from "@/lib/integrations/crypto";
import { runFullCatalogImport } from "@/services/catalog-import.service";
import { applyOwnerMenuImportRun, createOwnerMenuImportPreview } from "@/services/owner/owner-menu-imports.service";

const prismaMock = prisma as unknown as {
  connection: { findFirst: ReturnType<typeof vi.fn> };
  externalCatalogProduct: { findMany: ReturnType<typeof vi.fn> };
  menuImportProductMap: {
    findMany: ReturnType<typeof vi.fn>;
    upsert: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  menuImportRun: {
    create: ReturnType<typeof vi.fn>;
    findFirst: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  tenantCatalogProduct: {
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
};

describe("owner-menu-imports.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    prismaMock.connection.findFirst.mockResolvedValue({
      id: "conn-1",
      tenantId: "tenant-1",
      storeId: "store-1",
      provider: "LOYVERSE",
      status: "CONNECTED",
      externalStoreId: "ext-store",
      credentials: [{ configEncrypted: "enc-1" }],
    });

    vi.mocked(decryptJson).mockReturnValue({ accessToken: "token-1" });
    vi.mocked(runFullCatalogImport).mockResolvedValue({
      importRunId: "import-1",
      status: "SUCCEEDED",
      importedCategoriesCount: 0,
      importedProductsCount: 1,
      importedModifierGroupsCount: 0,
      importedModifierOptionsCount: 0,
    });
  });

  it("creates a preview run with CREATE action when mapping does not exist", async () => {
    prismaMock.externalCatalogProduct.findMany.mockResolvedValue([
      {
        externalId: "ext-prod-1",
        normalizedName: "Latte",
        normalizedPriceAmount: 550,
        entityHash: "hash-1",
        rawPayload: {
          item_name: "Latte",
          price: 5.5,
        },
      },
    ]);
    prismaMock.menuImportProductMap.findMany.mockResolvedValue([]);

    prismaMock.menuImportRun.create.mockImplementation(async ({ data }: { data: { summaryJson: unknown } }) => ({
      id: "run-1",
      connectionId: "conn-1",
      provider: "LOYVERSE",
      overwriteExisting: false,
      summaryJson: data.summaryJson,
      createdAt: new Date("2026-05-09T00:00:00.000Z"),
    }));

    const result = await createOwnerMenuImportPreview({
      tenantId: "tenant-1",
      connectionId: "conn-1",
      overwriteExisting: false,
      actorUserId: "user-1",
    });

    expect(result.summary.create).toBe(1);
    expect(result.items[0]?.action).toBe("CREATE");
    expect(result.items[0]?.shouldApply).toBe(true);
  });

  it("skips owner-changed mapped products when overwriteExisting is false", async () => {
    prismaMock.externalCatalogProduct.findMany.mockResolvedValue([
      {
        externalId: "ext-prod-1",
        normalizedName: "Latte",
        normalizedPriceAmount: 600,
        entityHash: "hash-new",
        rawPayload: {
          item_name: "Latte",
          price: 6,
        },
      },
    ]);
    prismaMock.menuImportProductMap.findMany.mockResolvedValue([
      {
        externalProductId: "ext-prod-1",
        tenantProductId: "tenant-prod-1",
        lastExternalHash: "hash-old",
        lastImportedName: "Latte",
        lastImportedPriceMillicents: 500000,
        tenantProduct: {
          id: "tenant-prod-1",
          name: "Owner Latte",
          basePriceAmount: 520000,
          deletedAt: null,
        },
      },
    ]);

    prismaMock.menuImportRun.create.mockImplementation(async ({ data }: { data: { summaryJson: unknown } }) => ({
      id: "run-2",
      connectionId: "conn-1",
      provider: "LOYVERSE",
      overwriteExisting: false,
      summaryJson: data.summaryJson,
      createdAt: new Date("2026-05-09T00:00:00.000Z"),
    }));

    const result = await createOwnerMenuImportPreview({
      tenantId: "tenant-1",
      connectionId: "conn-1",
      overwriteExisting: false,
      actorUserId: "user-1",
    });

    expect(result.summary.skipOwnerChanged).toBe(1);
    expect(result.items[0]?.action).toBe("SKIP_OWNER_CHANGED");
    expect(result.items[0]?.shouldApply).toBe(false);
  });

  it("applies create and update actions from a preview run", async () => {
    prismaMock.menuImportRun.findFirst.mockResolvedValue({
      id: "run-3",
      tenantId: "tenant-1",
      storeId: "store-1",
      connectionId: "conn-1",
      provider: "LOYVERSE",
      status: "PREVIEWED",
      overwriteExisting: true,
      summaryJson: {
        items: [
          {
            externalProductId: "ext-create",
            externalHash: "h1",
            externalName: "New Item",
            externalDescription: "Desc",
            externalPriceMillicents: 450000,
            action: "CREATE",
            shouldApply: true,
            mappedTenantProductId: null,
          },
          {
            externalProductId: "ext-update",
            externalHash: "h2",
            externalName: "Updated Item",
            externalDescription: "Updated Desc",
            externalPriceMillicents: 550000,
            action: "UPDATE",
            shouldApply: true,
            mappedTenantProductId: "tenant-prod-2",
          },
        ],
      },
    });

    prismaMock.tenantCatalogProduct.create.mockResolvedValue({ id: "tenant-prod-1", name: "New Item", basePriceAmount: 450000 });
    prismaMock.tenantCatalogProduct.update.mockResolvedValue({ id: "tenant-prod-2" });

    const result = await applyOwnerMenuImportRun({
      tenantId: "tenant-1",
      connectionId: "conn-1",
      runId: "run-3",
      actorUserId: "user-1",
    });

    expect(result.appliedCreates).toBe(1);
    expect(result.appliedUpdates).toBe(1);
    expect(result.failed).toBe(0);
    expect(result.tenantProductIds.sort()).toEqual(["tenant-prod-1", "tenant-prod-2"].sort());
    expect(prismaMock.menuImportRun.update).toHaveBeenCalled();
  });
});
