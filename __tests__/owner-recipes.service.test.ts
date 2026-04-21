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
  ingredient: { name: "Bread Flour", unit: "GRAM", unitCost: 5000 },
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
  marketplaceSourceId: null,
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-01"),
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
      ingredients: [mockIngRow],
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
      ingredients: [mockIngRow],
    });

    const result = await getRecipe(TENANT, "recipe-1");

    expect(result.catalogProductPrice).toBe(500);
    expect(result.marginAmount).toBe(500 - result.costPerUnit);
    expect(result.marginPercent).not.toBeNull();
  });

  it("returns null margin when no catalogProduct", async () => {
    mockPrisma.recipe.findFirst.mockResolvedValue({
      ...mockRecipeRow,
      ingredients: [],
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
      ingredients: [mockIngRow],
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
});

// ─── updateRecipe ─────────────────────────────────────────────────────────────

describe("updateRecipe", () => {
  it("updates recipe fields", async () => {
    mockPrisma.recipe.findFirst.mockResolvedValue(mockRecipeRow);
    mockPrisma.recipe.update.mockResolvedValue({
      ...mockRecipeRow,
      name: "Updated Bagel",
      ingredients: [],
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
      ingredients: [mockIngRow],
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

  it("throws if recipe not found", async () => {
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
      ingredients: [],
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
      ingredients: [],
    });

    await createRecipe(TENANT, {
      storeId: STORE,
      tenantCatalogProductId: tenantProductId,
      name: "New Recipe",
      yieldQty: 1,
      yieldUnit: "EACH",
      ingredients: [],
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
      ingredients: [],
    });

    await createRecipe(TENANT, {
      storeId: STORE,
      name: "New Recipe",
      yieldQty: 1,
      yieldUnit: "EACH",
      ingredients: [],
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
