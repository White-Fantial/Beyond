import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    tenantProductCategory: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    tenantCatalogProduct: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findFirstOrThrow: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    storeProductSelection: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      upsert: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

vi.mock("@/lib/audit", () => ({
  logAuditEvent: vi.fn().mockResolvedValue(undefined),
}));

import { prisma } from "@/lib/prisma";
import {
  listTenantProductCategories,
  createTenantProductCategory,
  updateTenantProductCategory,
  deleteTenantProductCategory,
  listTenantProducts,
  getTenantProduct,
  createTenantProduct,
  updateTenantProduct,
  deleteTenantProduct,
  listStoreProductSelections,
  selectProductForStore,
  deselectProductFromStore,
} from "@/services/owner/owner-tenant-products.service";

const mockPrisma = prisma as unknown as {
  tenantProductCategory: {
    findMany: ReturnType<typeof vi.fn>;
    findFirst: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };
  tenantCatalogProduct: {
    findMany: ReturnType<typeof vi.fn>;
    findFirst: ReturnType<typeof vi.fn>;
    findFirstOrThrow: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  storeProductSelection: {
    findMany: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    upsert: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };
};

const TENANT = "tenant-1";
const STORE = "store-1";
const ACTOR = "user-1";

const mockCategory = {
  id: "cat-1",
  tenantId: TENANT,
  name: "Beverages",
  displayOrder: 0,
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-01"),
};

const mockProduct = {
  id: "prod-1",
  tenantId: TENANT,
  name: "Espresso",
  description: "Strong coffee",
  shortDescription: "Coffee",
  basePriceAmount: 500000,
  currency: "USD",
  imageUrl: null,
  displayOrder: 0,
  isActive: true,
  internalNote: null,
  categoryId: "cat-1",
  deletedAt: null,
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-01"),
  _count: { storeSelections: 2 },
  category: { id: "cat-1", name: "Beverages" },
};

const mockSelection = {
  id: "sel-1",
  tenantId: TENANT,
  storeId: STORE,
  tenantProductId: "prod-1",
  customPriceAmount: null,
  isActive: true,
  displayOrder: 0,
  selectedAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-01"),
  tenantProduct: {
    id: "prod-1",
    name: "Espresso",
    description: "Strong coffee",
    shortDescription: "Coffee",
    basePriceAmount: 500000,
    currency: "USD",
    imageUrl: null,
  },
};

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── listTenantProductCategories ──────────────────────────────────────────────

describe("listTenantProductCategories", () => {
  it("returns categories ordered by displayOrder then name", async () => {
    mockPrisma.tenantProductCategory.findMany.mockResolvedValue([mockCategory]);

    const result = await listTenantProductCategories(TENANT);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("cat-1");
    expect(result[0].name).toBe("Beverages");
    expect(mockPrisma.tenantProductCategory.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { tenantId: TENANT },
        orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
      })
    );
  });

  it("returns empty array when no categories exist", async () => {
    mockPrisma.tenantProductCategory.findMany.mockResolvedValue([]);

    const result = await listTenantProductCategories(TENANT);

    expect(result).toHaveLength(0);
  });
});

// ─── createTenantProductCategory ─────────────────────────────────────────────

describe("createTenantProductCategory", () => {
  it("creates a category and returns the row", async () => {
    mockPrisma.tenantProductCategory.create.mockResolvedValue(mockCategory);

    const result = await createTenantProductCategory(TENANT, ACTOR, "Beverages", 0);

    expect(result.id).toBe("cat-1");
    expect(result.name).toBe("Beverages");
    expect(mockPrisma.tenantProductCategory.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ tenantId: TENANT, name: "Beverages", displayOrder: 0 }),
      })
    );
  });

  it("trims whitespace from name", async () => {
    mockPrisma.tenantProductCategory.create.mockResolvedValue({ ...mockCategory, name: "Coffee" });

    await createTenantProductCategory(TENANT, ACTOR, "  Coffee  ", 0);

    expect(mockPrisma.tenantProductCategory.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ name: "Coffee" }),
      })
    );
  });

  it("defaults displayOrder to 0", async () => {
    mockPrisma.tenantProductCategory.create.mockResolvedValue(mockCategory);

    await createTenantProductCategory(TENANT, ACTOR, "Beverages");

    expect(mockPrisma.tenantProductCategory.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ displayOrder: 0 }),
      })
    );
  });
});

// ─── updateTenantProductCategory ─────────────────────────────────────────────

describe("updateTenantProductCategory", () => {
  it("updates name and returns updated row", async () => {
    mockPrisma.tenantProductCategory.findFirst.mockResolvedValue(mockCategory);
    mockPrisma.tenantProductCategory.update.mockResolvedValue({
      ...mockCategory,
      name: "Hot Drinks",
    });

    const result = await updateTenantProductCategory(TENANT, "cat-1", ACTOR, {
      name: "Hot Drinks",
    });

    expect(result.name).toBe("Hot Drinks");
    expect(mockPrisma.tenantProductCategory.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "cat-1" },
        data: { name: "Hot Drinks" },
      })
    );
  });

  it("throws when category not found", async () => {
    mockPrisma.tenantProductCategory.findFirst.mockResolvedValue(null);

    await expect(
      updateTenantProductCategory(TENANT, "not-found", ACTOR, { name: "Test" })
    ).rejects.toThrow("Category not found");
  });

  it("updates displayOrder", async () => {
    mockPrisma.tenantProductCategory.findFirst.mockResolvedValue(mockCategory);
    mockPrisma.tenantProductCategory.update.mockResolvedValue({
      ...mockCategory,
      displayOrder: 5,
    });

    const result = await updateTenantProductCategory(TENANT, "cat-1", ACTOR, {
      displayOrder: 5,
    });

    expect(result.displayOrder).toBe(5);
  });
});

// ─── deleteTenantProductCategory ─────────────────────────────────────────────

describe("deleteTenantProductCategory", () => {
  it("deletes the category", async () => {
    mockPrisma.tenantProductCategory.findFirst.mockResolvedValue(mockCategory);
    mockPrisma.tenantProductCategory.delete.mockResolvedValue(mockCategory);

    await deleteTenantProductCategory(TENANT, "cat-1", ACTOR);

    expect(mockPrisma.tenantProductCategory.delete).toHaveBeenCalledWith({
      where: { id: "cat-1" },
    });
  });

  it("throws when category not found", async () => {
    mockPrisma.tenantProductCategory.findFirst.mockResolvedValue(null);

    await expect(
      deleteTenantProductCategory(TENANT, "not-found", ACTOR)
    ).rejects.toThrow("Category not found");
  });
});

// ─── listTenantProducts ───────────────────────────────────────────────────────

describe("listTenantProducts", () => {
  it("returns products with category and selection count", async () => {
    mockPrisma.tenantCatalogProduct.findMany.mockResolvedValue([mockProduct]);

    const result = await listTenantProducts(TENANT);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("prod-1");
    expect(result[0].name).toBe("Espresso");
    expect(result[0].categoryName).toBe("Beverages");
    expect(result[0].selectionCount).toBe(2);
    expect(result[0].basePriceAmount).toBe(500000);
  });

  it("serialises createdAt to ISO string", async () => {
    mockPrisma.tenantCatalogProduct.findMany.mockResolvedValue([mockProduct]);

    const result = await listTenantProducts(TENANT);

    expect(typeof result[0].createdAt).toBe("string");
    expect(result[0].createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("returns null categoryName when product has no category", async () => {
    mockPrisma.tenantCatalogProduct.findMany.mockResolvedValue([
      { ...mockProduct, categoryId: null, category: null },
    ]);

    const result = await listTenantProducts(TENANT);

    expect(result[0].categoryName).toBeNull();
    expect(result[0].categoryId).toBeNull();
  });

  it("returns empty array when no products exist", async () => {
    mockPrisma.tenantCatalogProduct.findMany.mockResolvedValue([]);

    const result = await listTenantProducts(TENANT);

    expect(result).toHaveLength(0);
  });

  it("filters by deletedAt null", async () => {
    mockPrisma.tenantCatalogProduct.findMany.mockResolvedValue([]);

    await listTenantProducts(TENANT);

    expect(mockPrisma.tenantCatalogProduct.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { tenantId: TENANT, deletedAt: null },
      })
    );
  });
});

// ─── getTenantProduct ─────────────────────────────────────────────────────────

describe("getTenantProduct", () => {
  it("returns a product by id", async () => {
    mockPrisma.tenantCatalogProduct.findFirst.mockResolvedValue(mockProduct);

    const result = await getTenantProduct(TENANT, "prod-1");

    expect(result).not.toBeNull();
    expect(result!.id).toBe("prod-1");
  });

  it("returns null when product does not exist", async () => {
    mockPrisma.tenantCatalogProduct.findFirst.mockResolvedValue(null);

    const result = await getTenantProduct(TENANT, "not-found");

    expect(result).toBeNull();
  });

  it("scopes query to tenantId and non-deleted", async () => {
    mockPrisma.tenantCatalogProduct.findFirst.mockResolvedValue(mockProduct);

    await getTenantProduct(TENANT, "prod-1");

    expect(mockPrisma.tenantCatalogProduct.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "prod-1", tenantId: TENANT, deletedAt: null },
      })
    );
  });
});

// ─── createTenantProduct ──────────────────────────────────────────────────────

describe("createTenantProduct", () => {
  it("creates a product with all fields", async () => {
    mockPrisma.tenantCatalogProduct.create.mockResolvedValue(mockProduct);

    const result = await createTenantProduct({
      tenantId: TENANT,
      actorUserId: ACTOR,
      data: {
        name: "Espresso",
        description: "Strong coffee",
        shortDescription: "Coffee",
        basePriceAmount: 500000,
        currency: "USD",
        categoryId: "cat-1",
      },
    });

    expect(result.id).toBe("prod-1");
    expect(result.name).toBe("Espresso");
    expect(result.basePriceAmount).toBe(500000);
    expect(result.categoryName).toBe("Beverages");
  });

  it("defaults basePriceAmount to 0 when not provided", async () => {
    mockPrisma.tenantCatalogProduct.create.mockResolvedValue({
      ...mockProduct,
      basePriceAmount: 0,
    });

    await createTenantProduct({
      tenantId: TENANT,
      actorUserId: ACTOR,
      data: { name: "Free Sample" },
    });

    expect(mockPrisma.tenantCatalogProduct.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ basePriceAmount: 0 }),
      })
    );
  });

  it("defaults currency to USD", async () => {
    mockPrisma.tenantCatalogProduct.create.mockResolvedValue(mockProduct);

    await createTenantProduct({
      tenantId: TENANT,
      actorUserId: ACTOR,
      data: { name: "Espresso" },
    });

    expect(mockPrisma.tenantCatalogProduct.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ currency: "USD" }),
      })
    );
  });

  it("defaults isActive to true", async () => {
    mockPrisma.tenantCatalogProduct.create.mockResolvedValue(mockProduct);

    await createTenantProduct({
      tenantId: TENANT,
      actorUserId: ACTOR,
      data: { name: "Espresso" },
    });

    expect(mockPrisma.tenantCatalogProduct.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ isActive: true }),
      })
    );
  });
});

// ─── updateTenantProduct ──────────────────────────────────────────────────────

describe("updateTenantProduct", () => {
  it("updates product fields", async () => {
    mockPrisma.tenantCatalogProduct.findFirstOrThrow.mockResolvedValue(mockProduct);
    mockPrisma.tenantCatalogProduct.update.mockResolvedValue(undefined);

    await updateTenantProduct({
      tenantId: TENANT,
      productId: "prod-1",
      actorUserId: ACTOR,
      data: { name: "Double Espresso", basePriceAmount: 700000 },
    });

    expect(mockPrisma.tenantCatalogProduct.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "prod-1" },
        data: expect.objectContaining({ name: "Double Espresso", basePriceAmount: 700000 }),
      })
    );
  });

  it("verifies product belongs to tenant before updating", async () => {
    mockPrisma.tenantCatalogProduct.findFirstOrThrow.mockResolvedValue(mockProduct);
    mockPrisma.tenantCatalogProduct.update.mockResolvedValue(undefined);

    await updateTenantProduct({
      tenantId: TENANT,
      productId: "prod-1",
      actorUserId: ACTOR,
      data: { name: "Updated" },
    });

    expect(mockPrisma.tenantCatalogProduct.findFirstOrThrow).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "prod-1", tenantId: TENANT, deletedAt: null },
      })
    );
  });
});

// ─── deleteTenantProduct ──────────────────────────────────────────────────────

describe("deleteTenantProduct", () => {
  it("soft-deletes by setting deletedAt", async () => {
    mockPrisma.tenantCatalogProduct.findFirstOrThrow.mockResolvedValue(mockProduct);
    mockPrisma.tenantCatalogProduct.update.mockResolvedValue(undefined);

    await deleteTenantProduct(TENANT, "prod-1", ACTOR);

    expect(mockPrisma.tenantCatalogProduct.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "prod-1" },
        data: expect.objectContaining({ deletedAt: expect.any(Date) }),
      })
    );
  });

  it("verifies product belongs to tenant before deleting", async () => {
    mockPrisma.tenantCatalogProduct.findFirstOrThrow.mockResolvedValue(mockProduct);
    mockPrisma.tenantCatalogProduct.update.mockResolvedValue(undefined);

    await deleteTenantProduct(TENANT, "prod-1", ACTOR);

    expect(mockPrisma.tenantCatalogProduct.findFirstOrThrow).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "prod-1", tenantId: TENANT, deletedAt: null },
      })
    );
  });
});

// ─── listStoreProductSelections ───────────────────────────────────────────────

describe("listStoreProductSelections", () => {
  it("returns selections with product info", async () => {
    mockPrisma.storeProductSelection.findMany.mockResolvedValue([mockSelection]);

    const result = await listStoreProductSelections(STORE);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("sel-1");
    expect(result[0].product.name).toBe("Espresso");
    expect(result[0].effectivePriceAmount).toBe(500000);
  });

  it("uses customPriceAmount as effectivePrice when set", async () => {
    const withCustomPrice = { ...mockSelection, customPriceAmount: 600000 };
    mockPrisma.storeProductSelection.findMany.mockResolvedValue([withCustomPrice]);

    const result = await listStoreProductSelections(STORE);

    expect(result[0].effectivePriceAmount).toBe(600000);
    expect(result[0].customPriceAmount).toBe(600000);
  });

  it("falls back to basePriceAmount when customPriceAmount is null", async () => {
    mockPrisma.storeProductSelection.findMany.mockResolvedValue([mockSelection]);

    const result = await listStoreProductSelections(STORE);

    expect(result[0].customPriceAmount).toBeNull();
    expect(result[0].effectivePriceAmount).toBe(500000);
  });

  it("serialises selectedAt to ISO string", async () => {
    mockPrisma.storeProductSelection.findMany.mockResolvedValue([mockSelection]);

    const result = await listStoreProductSelections(STORE);

    expect(typeof result[0].selectedAt).toBe("string");
    expect(result[0].selectedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});

// ─── selectProductForStore ────────────────────────────────────────────────────

describe("selectProductForStore", () => {
  it("upserts a product selection for the store", async () => {
    mockPrisma.tenantCatalogProduct.findFirstOrThrow.mockResolvedValue(mockProduct);
    mockPrisma.storeProductSelection.upsert.mockResolvedValue(mockSelection);

    const result = await selectProductForStore({
      tenantId: TENANT,
      storeId: STORE,
      tenantProductId: "prod-1",
      actorUserId: ACTOR,
    });

    expect(result.id).toBe("sel-1");
    expect(result.tenantProductId).toBe("prod-1");
    expect(mockPrisma.storeProductSelection.upsert).toHaveBeenCalled();
  });

  it("verifies tenant product belongs to tenant", async () => {
    mockPrisma.tenantCatalogProduct.findFirstOrThrow.mockResolvedValue(mockProduct);
    mockPrisma.storeProductSelection.upsert.mockResolvedValue(mockSelection);

    await selectProductForStore({
      tenantId: TENANT,
      storeId: STORE,
      tenantProductId: "prod-1",
      actorUserId: ACTOR,
    });

    expect(mockPrisma.tenantCatalogProduct.findFirstOrThrow).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "prod-1", tenantId: TENANT, deletedAt: null },
      })
    );
  });

  it("stores customPriceAmount when provided", async () => {
    mockPrisma.tenantCatalogProduct.findFirstOrThrow.mockResolvedValue(mockProduct);
    mockPrisma.storeProductSelection.upsert.mockResolvedValue({
      ...mockSelection,
      customPriceAmount: 450000,
    });

    await selectProductForStore({
      tenantId: TENANT,
      storeId: STORE,
      tenantProductId: "prod-1",
      actorUserId: ACTOR,
      customPriceAmount: 450000,
    });

    expect(mockPrisma.storeProductSelection.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ customPriceAmount: 450000 }),
      })
    );
  });
});

// ─── deselectProductFromStore ─────────────────────────────────────────────────

describe("deselectProductFromStore", () => {
  it("deletes the selection", async () => {
    mockPrisma.storeProductSelection.findUnique.mockResolvedValue({
      ...mockSelection,
      tenantId: TENANT,
    });
    mockPrisma.storeProductSelection.delete.mockResolvedValue(mockSelection);

    await deselectProductFromStore(TENANT, STORE, "prod-1", ACTOR);

    expect(mockPrisma.storeProductSelection.delete).toHaveBeenCalledWith({
      where: { storeId_tenantProductId: { storeId: STORE, tenantProductId: "prod-1" } },
    });
  });

  it("throws when selection not found", async () => {
    mockPrisma.storeProductSelection.findUnique.mockResolvedValue(null);

    await expect(
      deselectProductFromStore(TENANT, STORE, "not-found", ACTOR)
    ).rejects.toThrow("Product selection not found");
  });

  it("throws when selection belongs to different tenant (cross-tenant guard)", async () => {
    mockPrisma.storeProductSelection.findUnique.mockResolvedValue({
      ...mockSelection,
      tenantId: "other-tenant",
    });

    await expect(
      deselectProductFromStore(TENANT, STORE, "prod-1", ACTOR)
    ).rejects.toThrow("Product selection not found");
  });
});
