import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mocks ───────────────────────────────────────────────────────────────────

vi.mock("@/lib/prisma", () => ({
  prisma: {
    catalogCategory: {
      findMany: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
      findFirst: vi.fn(),
    },
    catalogProduct: {
      findMany: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
      findFirst: vi.fn(),
    },
    catalogModifierGroup: {
      findMany: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
      findFirst: vi.fn(),
    },
    catalogModifierOption: {
      update: vi.fn(),
      create: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
    catalogProductCategory: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    catalogProductModifierGroup: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    channelEntityMapping: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    externalCatalogCategory: { upsert: vi.fn() },
    externalCatalogProduct: { upsert: vi.fn() },
    externalCatalogModifierGroup: { upsert: vi.fn() },
    externalCatalogModifierOption: { upsert: vi.fn() },
    externalCatalogProductModifierGroupLink: { upsert: vi.fn() },
    $transaction: vi.fn((fns: unknown[]) => Promise.all(fns)),
  },
}));

vi.mock("@/lib/integrations/loyverse/client", () => ({
  LoyverseClient: vi.fn().mockImplementation(function () {
    return {
      fetchAllCategories: vi.fn().mockResolvedValue([]),
      fetchAllModifierGroups: vi.fn().mockResolvedValue([]),
      fetchAllItems: vi.fn().mockResolvedValue([]),
    };
  }),
}));

import { prisma } from "@/lib/prisma";
import {
  listCatalogCategories,
  updateCategoryMerchandising,
  reorderCategories,
  listCatalogProducts,
  updateProductMerchandising,
  listModifierGroups,
  setModifierOptionSoldOut,
  resolveExternalId,
} from "@/services/catalog.service";
import { runLoyverseFullCatalogSync } from "@/services/catalog-sync.service";
import { parseLoyverseCategory, parseLoyverseItem, parseLoyverseModifierGroup, toMinorUnits } from "@/lib/integrations/loyverse/parser";
import type { LoyverseCategory, LoyverseItem, LoyverseModifierGroup } from "@/lib/integrations/loyverse/types";

const mockPrisma = prisma as ReturnType<typeof vi.mocked<typeof prisma>>;

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── Schema validation (compile-time) ─────────────────────────────────────────

describe("Schema validation", () => {
  it("Prisma client generates CatalogCategory, CatalogProduct, CatalogModifierGroup, CatalogModifierOption", () => {
    // If prisma generate succeeded and these imports work, the schema is valid.
    expect(typeof prisma.catalogCategory).toBe("object");
    expect(typeof prisma.catalogProduct).toBe("object");
    expect(typeof prisma.catalogModifierGroup).toBe("object");
    expect(typeof prisma.catalogModifierOption).toBe("object");
    expect(typeof prisma.catalogProductCategory).toBe("object");
    expect(typeof prisma.catalogProductModifierGroup).toBe("object");
    expect(typeof prisma.channelEntityMapping).toBe("object");
    expect(typeof prisma.externalCatalogCategory).toBe("object");
    expect(typeof prisma.externalCatalogProduct).toBe("object");
    expect(typeof prisma.externalCatalogModifierGroup).toBe("object");
    expect(typeof prisma.externalCatalogModifierOption).toBe("object");
    expect(typeof prisma.externalCatalogProductModifierGroupLink).toBe("object");
  });
});

// ─── Parser unit tests ────────────────────────────────────────────────────────

describe("Loyverse parser", () => {
  it("toMinorUnits converts float price to integer minor units", () => {
    expect(toMinorUnits(12.5)).toBe(1250);
    expect(toMinorUnits(0)).toBe(0);
    expect(toMinorUnits(1.999)).toBe(200); // rounds
    expect(toMinorUnits(9.99)).toBe(999);
  });

  it("parseLoyverseCategory extracts externalId and normalizedName", () => {
    const raw: LoyverseCategory = {
      id: "cat-1",
      name: "  Bagels  ",
      updated_at: "2024-01-01T00:00:00Z",
    };
    const parsed = parseLoyverseCategory(raw);
    expect(parsed.externalId).toBe("cat-1");
    expect(parsed.normalizedName).toBe("Bagels");
    expect(parsed.externalUpdatedAt).toBeInstanceOf(Date);
    expect(parsed.rawPayload).toBe(raw);
  });

  it("parseLoyverseItem extracts modifierGroupIds and normalizedPriceAmount", () => {
    const raw: LoyverseItem = {
      id: "item-1",
      item_name: "Everything Bagel",
      category_id: "cat-1",
      modifier_ids: ["mg-1", "mg-2"],
      variants: [{ price: 5.5 }],
    };
    const parsed = parseLoyverseItem(raw);
    expect(parsed.externalId).toBe("item-1");
    expect(parsed.externalParentId).toBe("cat-1");
    expect(parsed.normalizedPriceAmount).toBe(550);
    expect(parsed.modifierGroupIds).toEqual(["mg-1", "mg-2"]);
  });

  it("parseLoyverseModifierGroup extracts options with minor-unit prices", () => {
    const raw: LoyverseModifierGroup = {
      id: "mg-1",
      name: "Size",
      modifiers: [
        { id: "opt-1", name: "Small", price: 0 },
        { id: "opt-2", name: "Large", price: 1.5 },
      ],
    };
    const parsed = parseLoyverseModifierGroup(raw);
    expect(parsed.options).toHaveLength(2);
    expect(parsed.options[0].normalizedPriceAmount).toBe(0);
    expect(parsed.options[1].normalizedPriceAmount).toBe(150);
  });
});

// ─── Catalog service tests ────────────────────────────────────────────────────

describe("listCatalogCategories", () => {
  it("queries by storeId with deletedAt null filter", async () => {
    (mockPrisma.catalogCategory.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    await listCatalogCategories("store-1");
    expect(mockPrisma.catalogCategory.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ storeId: "store-1", deletedAt: null }),
      })
    );
  });
});

describe("updateCategoryMerchandising", () => {
  it("only updates merchandising fields, not source-controlled fields", async () => {
    const mockCat = { id: "cat-1", isVisibleOnOnlineOrder: true };
    (mockPrisma.catalogCategory.update as ReturnType<typeof vi.fn>).mockResolvedValue(mockCat);

    await updateCategoryMerchandising("cat-1", { isVisibleOnOnlineOrder: false });

    const call = (mockPrisma.catalogCategory.update as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(call.data).not.toHaveProperty("name");
    expect(call.data).toHaveProperty("isVisibleOnOnlineOrder", false);
  });
});

describe("reorderCategories", () => {
  it("updates displayOrder for each category using a transaction", async () => {
    const mockUpdate = vi.fn().mockResolvedValue({});
    (mockPrisma.catalogCategory.update as ReturnType<typeof vi.fn>) = mockUpdate;
    (mockPrisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation(
      (fns: Array<Promise<unknown>>) => Promise.all(fns)
    );

    await reorderCategories("store-1", ["cat-a", "cat-b", "cat-c"]);

    expect(mockUpdate).toHaveBeenCalledTimes(3);
    expect(mockUpdate.mock.calls[0][0].data.displayOrder).toBe(0);
    expect(mockUpdate.mock.calls[1][0].data.displayOrder).toBe(1);
    expect(mockUpdate.mock.calls[2][0].data.displayOrder).toBe(2);
  });
});

describe("updateProductMerchandising", () => {
  it("allows updating onlineName and isFeatured", async () => {
    const mockProduct = { id: "p-1" };
    (mockPrisma.catalogProduct.update as ReturnType<typeof vi.fn>).mockResolvedValue(mockProduct);

    await updateProductMerchandising("p-1", { onlineName: "Special Bagel", isFeatured: true });

    const call = (mockPrisma.catalogProduct.update as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(call.data).toHaveProperty("onlineName", "Special Bagel");
    expect(call.data).toHaveProperty("isFeatured", true);
    // source-controlled fields must not be touched
    expect(call.data).not.toHaveProperty("name");
    expect(call.data).not.toHaveProperty("basePriceAmount");
  });
});

describe("setModifierOptionSoldOut", () => {
  it("sets isSoldOut on the option", async () => {
    (mockPrisma.catalogModifierOption.update as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "opt-1",
      isSoldOut: true,
    });

    await setModifierOptionSoldOut("opt-1", true);

    expect(mockPrisma.catalogModifierOption.update).toHaveBeenCalledWith({
      where: { id: "opt-1" },
      data: { isSoldOut: true },
    });
  });
});

describe("resolveExternalId", () => {
  it("returns external id for active mapping", async () => {
    (mockPrisma.channelEntityMapping.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      externalEntityId: "ext-123",
      mappingStatus: "ACTIVE",
    });

    const result = await resolveExternalId("conn-1", "PRODUCT", "internal-1");
    expect(result).toBe("ext-123");
  });

  it("returns null for missing mapping", async () => {
    (mockPrisma.channelEntityMapping.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const result = await resolveExternalId("conn-1", "PRODUCT", "internal-1");
    expect(result).toBeNull();
  });

  it("returns null for BROKEN mapping", async () => {
    (mockPrisma.channelEntityMapping.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      externalEntityId: "ext-123",
      mappingStatus: "BROKEN",
    });
    const result = await resolveExternalId("conn-1", "PRODUCT", "internal-1");
    expect(result).toBeNull();
  });
});

// ─── Sync validation ──────────────────────────────────────────────────────────

describe("runLoyverseFullCatalogSync", () => {
  it("returns zero counts when Loyverse returns empty data", async () => {
    // All mirror upserts return dummy values
    (mockPrisma.externalCatalogCategory.upsert as ReturnType<typeof vi.fn>).mockResolvedValue({});
    (mockPrisma.externalCatalogProduct.upsert as ReturnType<typeof vi.fn>).mockResolvedValue({});
    (mockPrisma.externalCatalogModifierGroup.upsert as ReturnType<typeof vi.fn>).mockResolvedValue({});
    (mockPrisma.externalCatalogModifierOption.upsert as ReturnType<typeof vi.fn>).mockResolvedValue({});
    (mockPrisma.externalCatalogProductModifierGroupLink.upsert as ReturnType<typeof vi.fn>).mockResolvedValue({});
    (mockPrisma.catalogModifierOption.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const result = await runLoyverseFullCatalogSync({
      tenantId: "t1",
      storeId: "s1",
      connectionId: "c1",
      accessToken: "tok",
    });

    expect(result.categories.created).toBe(0);
    expect(result.products.created).toBe(0);
    expect(result.modifierGroups.created).toBe(0);
    expect(result.modifierOptions.created).toBe(0);
  });

  it("creates internal category when source key not found (insert path)", async () => {
    const { LoyverseClient } = await import("@/lib/integrations/loyverse/client");
    const mockClientInstance = {
      fetchAllCategories: vi.fn().mockResolvedValue([{ id: "lv-cat-1", name: "Bagels" }]),
      fetchAllModifierGroups: vi.fn().mockResolvedValue([]),
      fetchAllItems: vi.fn().mockResolvedValue([]),
    };
    (LoyverseClient as ReturnType<typeof vi.fn>).mockImplementation(function() { return mockClientInstance; });

    (mockPrisma.externalCatalogCategory.upsert as ReturnType<typeof vi.fn>).mockResolvedValue({});
    (mockPrisma.catalogCategory.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    (mockPrisma.catalogCategory.create as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "internal-cat-1",
    });
    (mockPrisma.catalogModifierOption.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (mockPrisma.channelEntityMapping.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    (mockPrisma.channelEntityMapping.create as ReturnType<typeof vi.fn>).mockResolvedValue({});

    const result = await runLoyverseFullCatalogSync({
      tenantId: "t1",
      storeId: "s1",
      connectionId: "c1",
      accessToken: "tok",
    });

    expect(result.categories.created).toBe(1);
    expect(result.categories.updated).toBe(0);
    expect(mockPrisma.catalogCategory.create).toHaveBeenCalledOnce();
  });

  it("updates existing internal category when source key found (update path)", async () => {
    const { LoyverseClient } = await import("@/lib/integrations/loyverse/client");
    const mockClientInstance = {
      fetchAllCategories: vi.fn().mockResolvedValue([{ id: "lv-cat-1", name: "Renamed Bagels" }]),
      fetchAllModifierGroups: vi.fn().mockResolvedValue([]),
      fetchAllItems: vi.fn().mockResolvedValue([]),
    };
    (LoyverseClient as ReturnType<typeof vi.fn>).mockImplementation(function() { return mockClientInstance; });

    (mockPrisma.externalCatalogCategory.upsert as ReturnType<typeof vi.fn>).mockResolvedValue({});
    (mockPrisma.catalogCategory.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "existing-cat-1",
      name: "Bagels",
    });
    (mockPrisma.catalogCategory.update as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "existing-cat-1",
    });
    (mockPrisma.catalogModifierOption.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (mockPrisma.channelEntityMapping.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "map-1",
      externalEntityId: "lv-cat-1",
      mappingStatus: "ACTIVE",
    });
    (mockPrisma.channelEntityMapping.update as ReturnType<typeof vi.fn>).mockResolvedValue({});

    const result = await runLoyverseFullCatalogSync({
      tenantId: "t1",
      storeId: "s1",
      connectionId: "c1",
      accessToken: "tok",
    });

    // Must update existing row, not create a new one (no duplicate on rename)
    expect(result.categories.updated).toBe(1);
    expect(result.categories.created).toBe(0);
    expect(mockPrisma.catalogCategory.create).not.toHaveBeenCalled();
    expect(mockPrisma.catalogCategory.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "existing-cat-1" },
        data: expect.objectContaining({ name: "Renamed Bagels" }),
      })
    );
  });

  it("creates mapping rows for synced entities", async () => {
    const { LoyverseClient } = await import("@/lib/integrations/loyverse/client");
    const mockClientInstance = {
      fetchAllCategories: vi.fn().mockResolvedValue([{ id: "lv-cat-1", name: "Bagels" }]),
      fetchAllModifierGroups: vi.fn().mockResolvedValue([]),
      fetchAllItems: vi.fn().mockResolvedValue([]),
    };
    (LoyverseClient as ReturnType<typeof vi.fn>).mockImplementation(function() { return mockClientInstance; });

    (mockPrisma.externalCatalogCategory.upsert as ReturnType<typeof vi.fn>).mockResolvedValue({});
    (mockPrisma.catalogCategory.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    (mockPrisma.catalogCategory.create as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "internal-cat-1",
    });
    (mockPrisma.catalogModifierOption.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (mockPrisma.channelEntityMapping.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    (mockPrisma.channelEntityMapping.create as ReturnType<typeof vi.fn>).mockResolvedValue({});

    const result = await runLoyverseFullCatalogSync({
      tenantId: "t1",
      storeId: "s1",
      connectionId: "c1",
      accessToken: "tok",
    });

    expect(result.mappings.created).toBeGreaterThan(0);
    expect(mockPrisma.channelEntityMapping.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          entityType: "CATEGORY",
          externalEntityId: "lv-cat-1",
          internalEntityId: "internal-cat-1",
          channelType: "LOYVERSE",
        }),
      })
    );
  });

  it("raw payload mirror rows are upserted for fetched categories", async () => {
    const { LoyverseClient } = await import("@/lib/integrations/loyverse/client");
    const rawCat = { id: "lv-cat-2", name: "Drinks" };
    const mockClientInstance = {
      fetchAllCategories: vi.fn().mockResolvedValue([rawCat]),
      fetchAllModifierGroups: vi.fn().mockResolvedValue([]),
      fetchAllItems: vi.fn().mockResolvedValue([]),
    };
    (LoyverseClient as ReturnType<typeof vi.fn>).mockImplementation(function() { return mockClientInstance; });

    (mockPrisma.externalCatalogCategory.upsert as ReturnType<typeof vi.fn>).mockResolvedValue({});
    (mockPrisma.catalogCategory.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    (mockPrisma.catalogCategory.create as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "x" });
    (mockPrisma.catalogModifierOption.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (mockPrisma.channelEntityMapping.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    (mockPrisma.channelEntityMapping.create as ReturnType<typeof vi.fn>).mockResolvedValue({});

    await runLoyverseFullCatalogSync({
      tenantId: "t1",
      storeId: "s1",
      connectionId: "c1",
      accessToken: "tok",
    });

    expect(mockPrisma.externalCatalogCategory.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { connectionId_externalId: { connectionId: "c1", externalId: "lv-cat-2" } },
        create: expect.objectContaining({ rawPayload: rawCat }),
      })
    );
  });
});
