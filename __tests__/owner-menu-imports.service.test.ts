import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    connection: {
      findFirst: vi.fn(),
    },
    externalCatalogCategory: {
      findMany: vi.fn(),
    },
    externalCatalogModifierGroup: {
      findMany: vi.fn(),
    },
    externalCatalogModifierOption: {
      findMany: vi.fn(),
    },
    externalCatalogProduct: {
      findMany: vi.fn(),
    },
    externalCatalogProductModifierGroupLink: {
      findMany: vi.fn(),
    },
    tenantProductCategory: {
      upsert: vi.fn(),
    },
    tenantModifierGroup: {
      findMany: vi.fn(),
      createMany: vi.fn(),
    },
    tenantModifierOption: {
      findMany: vi.fn(),
      createMany: vi.fn(),
    },
    tenantProductModifierGroup: {
      createMany: vi.fn(),
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
  externalCatalogCategory: { findMany: ReturnType<typeof vi.fn> };
  externalCatalogModifierGroup: { findMany: ReturnType<typeof vi.fn> };
  externalCatalogModifierOption: { findMany: ReturnType<typeof vi.fn> };
  externalCatalogProduct: { findMany: ReturnType<typeof vi.fn> };
  externalCatalogProductModifierGroupLink: { findMany: ReturnType<typeof vi.fn> };
  tenantProductCategory: { upsert: ReturnType<typeof vi.fn> };
  tenantModifierGroup: { findMany: ReturnType<typeof vi.fn>; createMany: ReturnType<typeof vi.fn> };
  tenantModifierOption: { findMany: ReturnType<typeof vi.fn>; createMany: ReturnType<typeof vi.fn> };
  tenantProductModifierGroup: { createMany: ReturnType<typeof vi.fn> };
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

    // Default: empty external catalog data (no categories/modifiers)
    prismaMock.externalCatalogCategory.findMany.mockResolvedValue([]);
    prismaMock.externalCatalogModifierGroup.findMany.mockResolvedValue([]);
    prismaMock.externalCatalogModifierOption.findMany.mockResolvedValue([]);
    prismaMock.externalCatalogProduct.findMany.mockResolvedValue([]);
    prismaMock.externalCatalogProductModifierGroupLink.findMany.mockResolvedValue([]);

    prismaMock.tenantProductCategory.upsert.mockResolvedValue({ id: "cat-internal-1" });
    prismaMock.tenantModifierGroup.findMany.mockResolvedValue([]);
    prismaMock.tenantModifierGroup.createMany.mockResolvedValue({ count: 0 });
    prismaMock.tenantModifierOption.findMany.mockResolvedValue([]);
    prismaMock.tenantModifierOption.createMany.mockResolvedValue({ count: 0 });
    prismaMock.tenantProductModifierGroup.createMany.mockResolvedValue({ count: 0 });
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

  it("imports categories and sets categoryId on created products", async () => {
    prismaMock.menuImportRun.findFirst.mockResolvedValue({
      id: "run-cat",
      tenantId: "tenant-1",
      storeId: "store-1",
      connectionId: "conn-1",
      provider: "LOYVERSE",
      status: "PREVIEWED",
      overwriteExisting: false,
      summaryJson: {
        items: [
          {
            externalProductId: "ext-p1",
            externalHash: "h1",
            externalName: "Latte",
            externalDescription: null,
            externalPriceMillicents: 500000,
            action: "CREATE",
            shouldApply: true,
            mappedTenantProductId: null,
          },
        ],
      },
    });

    // External catalog has one category
    prismaMock.externalCatalogCategory.findMany.mockResolvedValue([
      { externalId: "cat-ext-1", normalizedName: "Beverages" },
    ]);
    prismaMock.tenantProductCategory.upsert.mockResolvedValue({ id: "cat-int-1" });

    // The product belongs to that category (externalParentId = "cat-ext-1")
    prismaMock.externalCatalogProduct.findMany.mockResolvedValue([
      { externalId: "ext-p1", externalParentId: "cat-ext-1" },
    ]);

    prismaMock.tenantCatalogProduct.create.mockResolvedValue({ id: "tp-1", name: "Latte", basePriceAmount: 500000 });

    await applyOwnerMenuImportRun({
      tenantId: "tenant-1",
      connectionId: "conn-1",
      runId: "run-cat",
      actorUserId: "user-1",
    });

    // TenantProductCategory should be upserted for "Beverages"
    expect(prismaMock.tenantProductCategory.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ name: "Beverages", tenantId: "tenant-1" }),
      })
    );

    // TenantCatalogProduct should be created with the resolved categoryId
    expect(prismaMock.tenantCatalogProduct.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ categoryId: "cat-int-1" }),
      })
    );
  });

  it("imports modifier groups and options from the external catalog", async () => {
    prismaMock.menuImportRun.findFirst.mockResolvedValue({
      id: "run-mg",
      tenantId: "tenant-1",
      storeId: "store-1",
      connectionId: "conn-1",
      provider: "LOYVERSE",
      status: "PREVIEWED",
      overwriteExisting: false,
      summaryJson: { items: [] },
    });

    prismaMock.externalCatalogModifierGroup.findMany.mockResolvedValue([
      { externalId: "mg-ext-1", normalizedName: "Size" },
    ]);
    // No existing modifier groups → will batch-create then re-fetch
    prismaMock.tenantModifierGroup.findMany
      .mockResolvedValueOnce([])               // first call: lookup existing
      .mockResolvedValueOnce([{ id: "mg-int-1", name: "Size" }]); // second call: after createMany
    prismaMock.tenantModifierGroup.createMany.mockResolvedValue({ count: 1 });

    prismaMock.externalCatalogModifierOption.findMany.mockResolvedValue([
      {
        externalId: "mo-ext-1",
        normalizedName: "Large",
        externalParentId: "mg-ext-1",
        rawPayload: { name: "Large", price: 1.5 },
      },
    ]);
    prismaMock.tenantModifierOption.findMany.mockResolvedValue([]);

    await applyOwnerMenuImportRun({
      tenantId: "tenant-1",
      connectionId: "conn-1",
      runId: "run-mg",
      actorUserId: "user-1",
    });

    expect(prismaMock.tenantModifierGroup.createMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.arrayContaining([
          expect.objectContaining({ name: "Size", tenantId: "tenant-1" }),
        ]),
      })
    );

    expect(prismaMock.tenantModifierOption.createMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.arrayContaining([
          expect.objectContaining({
            name: "Large",
            tenantModifierGroupId: "mg-int-1",
            priceDeltaAmount: 150000, // $1.50 in millicents
          }),
        ]),
      })
    );
  });

  it("creates product–modifier-group links for imported products", async () => {
    prismaMock.menuImportRun.findFirst.mockResolvedValue({
      id: "run-link",
      tenantId: "tenant-1",
      storeId: "store-1",
      connectionId: "conn-1",
      provider: "LOYVERSE",
      status: "PREVIEWED",
      overwriteExisting: false,
      summaryJson: {
        items: [
          {
            externalProductId: "ext-p1",
            externalHash: "h1",
            externalName: "Latte",
            externalDescription: null,
            externalPriceMillicents: 500000,
            action: "CREATE",
            shouldApply: true,
            mappedTenantProductId: null,
          },
        ],
      },
    });

    prismaMock.externalCatalogModifierGroup.findMany.mockResolvedValue([
      { externalId: "mg-ext-1", normalizedName: "Size" },
    ]);
    // "Size" already exists in the tenant
    prismaMock.tenantModifierGroup.findMany.mockResolvedValue([{ id: "mg-int-1", name: "Size" }]);

    prismaMock.tenantCatalogProduct.create.mockResolvedValue({ id: "tp-1", name: "Latte", basePriceAmount: 500000 });

    // External product–modifier link
    prismaMock.externalCatalogProductModifierGroupLink.findMany.mockResolvedValue([
      { externalProductId: "ext-p1", externalModifierGroupId: "mg-ext-1" },
    ]);

    await applyOwnerMenuImportRun({
      tenantId: "tenant-1",
      connectionId: "conn-1",
      runId: "run-link",
      actorUserId: "user-1",
    });

    expect(prismaMock.tenantProductModifierGroup.createMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.arrayContaining([
          expect.objectContaining({
            tenantProductId: "tp-1",
            tenantModifierGroupId: "mg-int-1",
            tenantId: "tenant-1",
          }),
        ]),
        skipDuplicates: true,
      })
    );
  });
});
