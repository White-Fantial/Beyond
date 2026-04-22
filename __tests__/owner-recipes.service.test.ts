import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    recipe: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
  },
}));

// Mock the bulk cost resolver so recipe tests don't need to wire up supplier price tables
vi.mock("@/services/owner/owner-supplier-prices.service", () => ({
  resolveEffectiveCostsBulk: vi.fn().mockResolvedValue(
    new Map([["sp-1", { price: 5000, resolved: true }]])
  ),
}));

import { prisma } from "@/lib/prisma";
import {
  listRecipes,
  getRecipe,
  createRecipe,
  updateRecipe,
  deleteRecipe,
  getTenantProductRecipes,
} from "@/services/owner/owner-recipes.service";

const mockPrisma = prisma as unknown as {
  recipe: {
    findMany: ReturnType<typeof vi.fn>;
    findFirst: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    count: ReturnType<typeof vi.fn>;
  };
};

const TENANT = "tenant-1";
const STORE = "store-1";

const mockIngRow = {
  id: "ri-1",
  recipeId: "recipe-1",
  ingredientId: "ing-1",
  quantity: { toNumber: () => 250 },
  unit: "GRAM",
  ingredient: {
    name: "Bread Flour",
    unit: "GRAM",
    supplierLinks: [{ isPreferred: true, supplierProduct: { id: "sp-1", referencePrice: 5000 } }],
  },
};

/** A product component whose sub-product has a recipe costing 120 minor-units / yield unit. */
const mockProductComponentRow = {
  id: "pc-1",
  recipeId: "recipe-1",
  tenantProductId: "tp-comp-1",
  quantity: { toNumber: () => 2 },
  unit: "EACH",
  tenantProduct: {
    id: "tp-comp-1",
    name: "Bulgogi Filling",
    tenantId: TENANT,
    recipes: [
      {
        tenantCatalogProductId: "tp-comp-1",
        yieldQty: 1,
        yieldUnit: "EACH",
        // ingredients have no supplierLinks → cost resolves to 0 (mocked costMap has only "sp-1")
        ingredients: [], productComponents: [],
      },
    ],
  },
};

const mockRecipeRow = {
  id: "recipe-1",
  tenantId: TENANT,
  storeId: STORE,
  catalogProductId: null,
  tenantCatalogProductId: null,
  catalogProduct: null,
  name: "Classic Bagel",
  yieldQty: 12,
  yieldUnit: "EACH",
  notes: null,
  instructions: null,
  marketplaceSourceId: null,
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-01"),
  productComponents: [],
};

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── listRecipes ──────────────────────────────────────────────────────────────

describe("listRecipes", () => {
  it("returns paginated recipes", async () => {
    mockPrisma.recipe.findMany.mockResolvedValue([mockRecipeRow]);
    mockPrisma.recipe.count.mockResolvedValue(1);

    const result = await listRecipes(TENANT);

    expect(result.items).toHaveLength(1);
    expect(result.total).toBe(1);
    expect(result.items[0].name).toBe("Classic Bagel");
  });

  it("filters by storeId", async () => {
    mockPrisma.recipe.findMany.mockResolvedValue([]);
    mockPrisma.recipe.count.mockResolvedValue(0);

    await listRecipes(TENANT, { storeId: STORE });

    expect(mockPrisma.recipe.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ storeId: STORE }),
      })
    );
  });

  it("excludes soft-deleted recipes", async () => {
    mockPrisma.recipe.findMany.mockResolvedValue([]);
    mockPrisma.recipe.count.mockResolvedValue(0);

    await listRecipes(TENANT);

    expect(mockPrisma.recipe.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ deletedAt: null }),
      })
    );
  });
});

// ─── getRecipe ────────────────────────────────────────────────────────────────

describe("getRecipe", () => {
  it("returns recipe with cost calculations", async () => {
    mockPrisma.recipe.findFirst.mockResolvedValue({
      ...mockRecipeRow,
      ingredients: [mockIngRow], productComponents: [],
    });

    const result = await getRecipe(TENANT, "recipe-1");

    // lineCost = 250 × 5000 / 1000 = 1250 (cents)
    expect(result.ingredients).toHaveLength(1);
    expect(result.ingredients[0].lineCost).toBe(1250);
    expect(result.totalCost).toBe(1250);
    // costPerUnit = 1250 / 12 = ~104
    expect(result.costPerUnit).toBe(Math.round(1250 / 12));
  });

  it("computes margin when catalogProduct has a price", async () => {
    mockPrisma.recipe.findFirst.mockResolvedValue({
      ...mockRecipeRow,
      catalogProductId: "prod-1",
      catalogProduct: { name: "Bagel", basePriceAmount: 500 },
      ingredients: [mockIngRow], productComponents: [],
    });

    const result = await getRecipe(TENANT, "recipe-1");

    expect(result.catalogProductPrice).toBe(500);
    expect(result.marginAmount).toBe(500 - result.costPerUnit);
    expect(result.marginPercent).not.toBeNull();
  });

  it("returns null margin when no catalogProduct", async () => {
    mockPrisma.recipe.findFirst.mockResolvedValue({
      ...mockRecipeRow,
      ingredients: [], productComponents: [],
    });

    const result = await getRecipe(TENANT, "recipe-1");

    expect(result.marginAmount).toBeNull();
    expect(result.marginPercent).toBeNull();
  });

  it("throws if recipe not found", async () => {
    mockPrisma.recipe.findFirst.mockResolvedValue(null);

    await expect(getRecipe(TENANT, "missing")).rejects.toThrow("not found");
  });
});

// ─── createRecipe ─────────────────────────────────────────────────────────────

describe("createRecipe", () => {
  it("creates recipe and returns cost breakdown", async () => {
    mockPrisma.recipe.create.mockResolvedValue({
      ...mockRecipeRow,
      ingredients: [mockIngRow], productComponents: [],
    });

    const result = await createRecipe(TENANT, {
      storeId: STORE,
      name: "Classic Bagel",
      yieldQty: 12,
      yieldUnit: "EACH",
      ingredients: [{ ingredientId: "ing-1", quantity: 250, unit: "GRAM" }],
    });

    expect(result.name).toBe("Classic Bagel");
    expect(result.ingredients).toHaveLength(1);
    expect(mockPrisma.recipe.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          tenantId: TENANT,
          storeId: STORE,
          yieldQty: 12,
        }),
      })
    );
  });

  it("saves instructions when provided", async () => {
    mockPrisma.recipe.create.mockResolvedValue({
      ...mockRecipeRow,
      instructions: "Mix flour and water.",
      ingredients: [], productComponents: [],
    });

    await createRecipe(TENANT, {
      storeId: STORE,
      name: "Classic Bagel",
      yieldQty: 12,
      yieldUnit: "EACH",
      instructions: "Mix flour and water.",
      ingredients: [], productComponents: [],
    });

    expect(mockPrisma.recipe.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          instructions: "Mix flour and water.",
        }),
      })
    );
  });
});

// ─── updateRecipe ─────────────────────────────────────────────────────────────

describe("updateRecipe", () => {
  it("updates recipe fields", async () => {
    mockPrisma.recipe.findFirst.mockResolvedValue(mockRecipeRow);
    mockPrisma.recipe.update.mockResolvedValue({
      ...mockRecipeRow,
      name: "Updated Bagel",
      ingredients: [], productComponents: [],
    });

    const result = await updateRecipe(TENANT, "recipe-1", { name: "Updated Bagel" });

    expect(result.name).toBe("Updated Bagel");
    expect(mockPrisma.recipe.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "recipe-1" },
        data: expect.objectContaining({ name: "Updated Bagel" }),
      })
    );
  });

  it("replaces ingredients when provided", async () => {
    mockPrisma.recipe.findFirst.mockResolvedValue(mockRecipeRow);
    mockPrisma.recipe.update.mockResolvedValue({
      ...mockRecipeRow,
      ingredients: [mockIngRow], productComponents: [],
    });

    await updateRecipe(TENANT, "recipe-1", {
      ingredients: [{ ingredientId: "ing-1", quantity: 100, unit: "GRAM" }],
    });

    expect(mockPrisma.recipe.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          ingredients: expect.objectContaining({ deleteMany: {} }),
        }),
      })
    );
  });

  it("updates instructions when provided", async () => {
    mockPrisma.recipe.findFirst.mockResolvedValue(mockRecipeRow);
    mockPrisma.recipe.update.mockResolvedValue({
      ...mockRecipeRow,
      instructions: "Knead for 10 minutes.",
      ingredients: [], productComponents: [],
    });

    const result = await updateRecipe(TENANT, "recipe-1", { instructions: "Knead for 10 minutes." });

    expect(result.instructions).toBe("Knead for 10 minutes.");
    expect(mockPrisma.recipe.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ instructions: "Knead for 10 minutes." }),
      })
    );
  });

  it("throws if recipe not found (updateRecipe)", async () => {
    mockPrisma.recipe.findFirst.mockResolvedValue(null);

    await expect(updateRecipe(TENANT, "missing", {})).rejects.toThrow("not found");
  });
});

// ─── deleteRecipe ─────────────────────────────────────────────────────────────

describe("deleteRecipe", () => {
  it("soft-deletes the recipe", async () => {
    mockPrisma.recipe.findFirst.mockResolvedValue(mockRecipeRow);
    mockPrisma.recipe.update.mockResolvedValue({
      ...mockRecipeRow,
      deletedAt: new Date(),
    });

    await deleteRecipe(TENANT, "recipe-1");

    expect(mockPrisma.recipe.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "recipe-1" },
        data: expect.objectContaining({ deletedAt: expect.any(Date) }),
      })
    );
  });

  it("throws if recipe not found", async () => {
    mockPrisma.recipe.findFirst.mockResolvedValue(null);

    await expect(deleteRecipe(TENANT, "missing")).rejects.toThrow("not found");
  });
});

// ─── getTenantProductRecipes ──────────────────────────────────────────────────

describe("getTenantProductRecipes", () => {
  it("returns recipes for a tenant catalog product across all stores", async () => {
    const tenantProductId = "tp-1";
    const row = {
      ...mockRecipeRow,
      tenantCatalogProductId: tenantProductId,
      ingredients: [], productComponents: [],
    };
    mockPrisma.recipe.findMany.mockResolvedValue([row]);

    const result = await getTenantProductRecipes(TENANT, tenantProductId);

    expect(result).toHaveLength(1);
    expect(result[0].tenantCatalogProductId).toBe(tenantProductId);
    expect(mockPrisma.recipe.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { tenantId: TENANT, tenantCatalogProductId: tenantProductId, deletedAt: null },
      })
    );
  });

  it("returns empty array when no recipes linked", async () => {
    mockPrisma.recipe.findMany.mockResolvedValue([]);

    const result = await getTenantProductRecipes(TENANT, "tp-none");

    expect(result).toHaveLength(0);
  });
});

// ─── createRecipe with tenantCatalogProductId ─────────────────────────────────

describe("createRecipe with tenantCatalogProductId", () => {
  it("saves tenantCatalogProductId when provided", async () => {
    const tenantProductId = "tp-1";
    mockPrisma.recipe.create.mockResolvedValue({
      ...mockRecipeRow,
      tenantCatalogProductId: tenantProductId,
      ingredients: [], productComponents: [],
    });

    await createRecipe(TENANT, {
      storeId: STORE,
      tenantCatalogProductId: tenantProductId,
      name: "New Recipe",
      yieldQty: 1,
      yieldUnit: "EACH",
      ingredients: [], productComponents: [],
    });

    expect(mockPrisma.recipe.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          tenantCatalogProductId: tenantProductId,
        }),
      })
    );
  });

  it("saves null tenantCatalogProductId when not provided", async () => {
    mockPrisma.recipe.create.mockResolvedValue({
      ...mockRecipeRow,
      ingredients: [], productComponents: [],
    });

    await createRecipe(TENANT, {
      storeId: STORE,
      name: "New Recipe",
      yieldQty: 1,
      yieldUnit: "EACH",
      ingredients: [], productComponents: [],
    });

    expect(mockPrisma.recipe.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          tenantCatalogProductId: null,
        }),
      })
    );
  });
});

// ─── productComponents in createRecipe ───────────────────────────────────────

describe("createRecipe with productComponents", () => {
  it("saves productComponents when provided", async () => {
    mockPrisma.recipe.create.mockResolvedValue({
      ...mockRecipeRow,
      tenantCatalogProductId: "tp-owner",
      ingredients: [], productComponents: [mockProductComponentRow],
    });

    await createRecipe(TENANT, {
      storeId: STORE,
      tenantCatalogProductId: "tp-owner",
      name: "Bulgogi Sandwich",
      yieldQty: 1,
      yieldUnit: "EACH",
      ingredients: [],
      productComponents: [{ tenantProductId: "tp-comp-1", quantity: 2, unit: "EACH" }],
    });

    expect(mockPrisma.recipe.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          productComponents: expect.objectContaining({
            create: expect.arrayContaining([
              expect.objectContaining({ tenantProductId: "tp-comp-1", quantity: 2, unit: "EACH" }),
            ]),
          }),
        }),
      })
    );
  });

  it("computes productComponent lineCost from sub-product recipe costPerUnit", async () => {
    // mockProductComponentRow has yieldQty=1 and ingredients=[] → costPerUnit=0
    mockPrisma.recipe.findFirst.mockResolvedValue({
      ...mockRecipeRow,
      tenantCatalogProductId: "tp-owner",
      ingredients: [], productComponents: [mockProductComponentRow],
    });

    const result = await getRecipe(TENANT, "recipe-1");

    expect(result.productComponents).toHaveLength(1);
    // sub-product has no ingredients → costPerUnit=0 → lineCost=0
    expect(result.productComponents[0].tenantProductCostPerUnit).toBe(0);
    expect(result.productComponents[0].lineCost).toBe(0);
    expect(result.productComponents[0].tenantProductName).toBe("Bulgogi Filling");
  });

  it("omits productComponents key when none provided", async () => {
    mockPrisma.recipe.create.mockResolvedValue({
      ...mockRecipeRow,
      ingredients: [], productComponents: [],
    });

    await createRecipe(TENANT, {
      storeId: STORE,
      name: "Plain Recipe",
      yieldQty: 1,
      yieldUnit: "EACH",
      ingredients: [],
    });

    const callArg = mockPrisma.recipe.create.mock.calls[0][0];
    expect(callArg.data.productComponents).toBeUndefined();
  });
});

// ─── updateRecipe with productComponents ──────────────────────────────────────

describe("updateRecipe with productComponents", () => {
  it("replaces productComponents when provided", async () => {
    mockPrisma.recipe.findFirst.mockResolvedValue(mockRecipeRow);
    mockPrisma.recipe.update.mockResolvedValue({
      ...mockRecipeRow,
      ingredients: [], productComponents: [mockProductComponentRow],
    });

    await updateRecipe(TENANT, "recipe-1", {
      productComponents: [{ tenantProductId: "tp-comp-1", quantity: 3, unit: "EACH" }],
    });

    expect(mockPrisma.recipe.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          productComponents: expect.objectContaining({
            deleteMany: {},
            create: expect.arrayContaining([
              expect.objectContaining({ tenantProductId: "tp-comp-1" }),
            ]),
          }),
        }),
      })
    );
  });

  it("does not touch productComponents when not in update input", async () => {
    mockPrisma.recipe.findFirst.mockResolvedValue(mockRecipeRow);
    mockPrisma.recipe.update.mockResolvedValue({
      ...mockRecipeRow,
      name: "Renamed",
      ingredients: [], productComponents: [],
    });

    await updateRecipe(TENANT, "recipe-1", { name: "Renamed" });

    const callArg = mockPrisma.recipe.update.mock.calls[0][0];
    expect(callArg.data.productComponents).toBeUndefined();
  });
});

// ─── circular reference detection ────────────────────────────────────────────

describe("circular reference detection in createRecipe", () => {
  it("rejects direct self-reference (product A as component of its own recipe)", async () => {
    const ownerProductId = "tp-owner";
    // DFS: recipe for ownerProductId → component is ownerProductId itself → circular
    mockPrisma.recipe.findMany.mockResolvedValue([
      {
        productComponents: [{ tenantProductId: ownerProductId }],
      },
    ]);

    await expect(
      createRecipe(TENANT, {
        storeId: STORE,
        tenantCatalogProductId: ownerProductId,
        name: "Circular",
        yieldQty: 1,
        yieldUnit: "EACH",
        ingredients: [],
        productComponents: [{ tenantProductId: ownerProductId, quantity: 1, unit: "EACH" }],
      })
    ).rejects.toThrow("Circular reference");
  });

  it("rejects indirect circular reference (A → B → A)", async () => {
    const productA = "tp-A";
    const productB = "tp-B";
    // createRecipe for productA, trying to add productB as component
    // DFS: B's recipe has A as component → circular
    mockPrisma.recipe.findMany.mockResolvedValue([
      {
        // B's recipe components include A
        productComponents: [{ tenantProductId: productA }],
      },
    ]);

    await expect(
      createRecipe(TENANT, {
        storeId: STORE,
        tenantCatalogProductId: productA,
        name: "Indirect Circular",
        yieldQty: 1,
        yieldUnit: "EACH",
        ingredients: [],
        productComponents: [{ tenantProductId: productB, quantity: 1, unit: "EACH" }],
      })
    ).rejects.toThrow("Circular reference");
  });

  it("allows non-circular components (A → B, B has no recipe referencing A)", async () => {
    const productA = "tp-A";
    const productB = "tp-B";
    // B's recipe components only reference C (not A)
    mockPrisma.recipe.findMany.mockResolvedValue([
      { productComponents: [{ tenantProductId: "tp-C" }] },
    ]);
    // Further DFS for C returns no recipes
    mockPrisma.recipe.findMany
      .mockResolvedValueOnce([{ productComponents: [{ tenantProductId: "tp-C" }] }])
      .mockResolvedValueOnce([]);

    mockPrisma.recipe.create.mockResolvedValue({
      ...mockRecipeRow,
      tenantCatalogProductId: productA,
      ingredients: [], productComponents: [],
    });

    await expect(
      createRecipe(TENANT, {
        storeId: STORE,
        tenantCatalogProductId: productA,
        name: "Valid",
        yieldQty: 1,
        yieldUnit: "EACH",
        ingredients: [],
        productComponents: [{ tenantProductId: productB, quantity: 1, unit: "EACH" }],
      })
    ).resolves.toBeDefined();
  });
});
