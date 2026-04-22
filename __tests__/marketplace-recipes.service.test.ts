import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    marketplaceRecipe: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    ingredient: {
      findMany: vi.fn(),
    },
    ingredientSupplierLink: {
      findMany: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";
import {
  listMarketplaceRecipes,
  getMarketplaceRecipe,
  createMarketplaceRecipe,
  updateMarketplaceRecipe,
  deleteMarketplaceRecipe,
} from "@/services/marketplace/recipe-marketplace.service";

const mockPrisma = prisma as unknown as {
  marketplaceRecipe: {
    findMany: ReturnType<typeof vi.fn>;
    findFirst: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    count: ReturnType<typeof vi.fn>;
  };
  ingredient: {
    findMany: ReturnType<typeof vi.fn>;
  };
  ingredientSupplierLink: {
    findMany: ReturnType<typeof vi.fn>;
  };
};

const PROVIDER_ID = "user-provider-1";
const CREATOR_ID = "user-admin-1";

const mockRecipeRow = {
  id: "recipe-1",
  type: "PREMIUM",
  status: "DRAFT",
  title: "Kimchi Stew",
  description: "Delicious kimchi stew",
  thumbnailUrl: null,
  providerId: PROVIDER_ID,
  createdByUserId: CREATOR_ID,
  yieldQty: 4,
  yieldUnit: "SERVING",
  servings: 4,
  cuisineTag: "Korean",
  difficulty: "EASY",
  prepTimeMinutes: 10,
  cookTimeMinutes: 20,
  instructions: "Chop the kimchi.\n\nSimmer everything together.",
  currency: "USD",
  estimatedCostPrice: 0,
  recommendedPrice: 5000,
  salePrice: 4500,
  publishedAt: null,
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-01"),
  provider: { name: "Recipe Provider" },
};

const mockIngredientRow = {
  id: "mri-1",
  recipeId: "recipe-1",
  ingredientId: "pi-1",
  quantity: { toNumber: () => 300 },
  unit: "GRAM",
  notes: null,
  unitCostSnapshot: 10000,
  ingredient: { name: "Kimchi", unitCost: 10000 },
};

beforeEach(() => {
  vi.clearAllMocks();
  mockPrisma.ingredientSupplierLink.findMany.mockResolvedValue([]);
});

// ─── listMarketplaceRecipes ───────────────────────────────────────────────────

describe("listMarketplaceRecipes", () => {
  it("returns paginated recipes", async () => {
    mockPrisma.marketplaceRecipe.findMany.mockResolvedValue([mockRecipeRow]);
    mockPrisma.marketplaceRecipe.count.mockResolvedValue(1);

    const result = await listMarketplaceRecipes();

    expect(result.items).toHaveLength(1);
    expect(result.total).toBe(1);
    expect(result.items[0].title).toBe("Kimchi Stew");
    expect(result.items[0].providerName).toBe("Recipe Provider");
  });

  it("filters by type and status", async () => {
    mockPrisma.marketplaceRecipe.findMany.mockResolvedValue([]);
    mockPrisma.marketplaceRecipe.count.mockResolvedValue(0);

    await listMarketplaceRecipes({ type: "PREMIUM", status: "PUBLISHED" });

    expect(mockPrisma.marketplaceRecipe.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ type: "PREMIUM", status: "PUBLISHED" }),
      })
    );
  });

  it("serialises dates to ISO strings", async () => {
    mockPrisma.marketplaceRecipe.findMany.mockResolvedValue([mockRecipeRow]);
    mockPrisma.marketplaceRecipe.count.mockResolvedValue(1);

    const result = await listMarketplaceRecipes();
    expect(typeof result.items[0].createdAt).toBe("string");
    expect(result.items[0].createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});

// ─── getMarketplaceRecipe ─────────────────────────────────────────────────────

describe("getMarketplaceRecipe", () => {
  it("returns recipe with instructions and ingredients", async () => {
    mockPrisma.marketplaceRecipe.findFirst.mockResolvedValue({
      ...mockRecipeRow,
      ingredients: [mockIngredientRow],
    });
    mockPrisma.marketplaceRecipe.update.mockResolvedValue(mockRecipeRow);

    const result = await getMarketplaceRecipe("recipe-1");

    expect(result.title).toBe("Kimchi Stew");
    expect(result.instructions).toBe("Chop the kimchi.\n\nSimmer everything together.");
    expect(result.ingredients).toHaveLength(1);
    expect(result.ingredients[0].ingredientName).toBe("Kimchi");
    expect(result.ingredients[0].lineCost).toBe(3000); // 300 * 10000 / 1000
    expect(result.ingredientCount).toBe(1);
  });

  it("recomputes estimatedCostPrice when it differs from the snapshot-based line costs", async () => {
    const snapshot = 10000;
    const storedEstimate = 0; // stored value is stale / wrong
    mockPrisma.marketplaceRecipe.findFirst.mockResolvedValue({
      ...mockRecipeRow,
      estimatedCostPrice: storedEstimate,
      ingredients: [
        {
          ...mockIngredientRow,
          unitCostSnapshot: snapshot,
          ingredient: { name: "Kimchi" },
        },
      ],
    });
    mockPrisma.marketplaceRecipe.update.mockResolvedValue(mockRecipeRow);

    const result = await getMarketplaceRecipe("recipe-1");

    // lineCost uses unitCostSnapshot: 300 * 10000 / 1000 = 3000
    expect(result.ingredients[0].lineCost).toBe(3000);
    // unitCostSnapshot is preserved as-is
    expect(result.ingredients[0].unitCostSnapshot).toBe(snapshot);
    // estimatedCostPrice updated to match lineCost sum
    expect(result.estimatedCostPrice).toBe(3000);
    // DB should have been updated
    expect(mockPrisma.marketplaceRecipe.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "recipe-1" },
        data: expect.objectContaining({ estimatedCostPrice: 3000 }),
      })
    );
  });

  it("throws when not found", async () => {
    mockPrisma.marketplaceRecipe.findFirst.mockResolvedValue(null);

    await expect(getMarketplaceRecipe("nonexistent")).rejects.toThrow(
      "MarketplaceRecipe nonexistent not found"
    );
  });
});

// ─── createMarketplaceRecipe ──────────────────────────────────────────────────

describe("createMarketplaceRecipe", () => {
  it("creates a PREMIUM recipe with DRAFT status", async () => {
    mockPrisma.ingredient.findMany.mockResolvedValue([]);
    mockPrisma.marketplaceRecipe.create.mockResolvedValue({
      ...mockRecipeRow,
      ingredients: [],
    });
    mockPrisma.marketplaceRecipe.update.mockResolvedValue(mockRecipeRow);

    const result = await createMarketplaceRecipe(CREATOR_ID, PROVIDER_ID, {
      type: "PREMIUM",
      title: "Kimchi Stew",
      yieldQty: 4,
      yieldUnit: "SERVING",
      salePrice: 4500,
      recommendedPrice: 5000,
    });

    expect(result.title).toBe("Kimchi Stew");
    expect(mockPrisma.marketplaceRecipe.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          type: "PREMIUM",
          status: "DRAFT",
          providerId: PROVIDER_ID,
          createdByUserId: CREATOR_ID,
        }),
      })
    );
  });

  it("saves instructions when provided", async () => {
    mockPrisma.ingredient.findMany.mockResolvedValue([]);
    mockPrisma.marketplaceRecipe.create.mockResolvedValue({
      ...mockRecipeRow,
      ingredients: [],
    });
    mockPrisma.marketplaceRecipe.update.mockResolvedValue(mockRecipeRow);

    await createMarketplaceRecipe(CREATOR_ID, PROVIDER_ID, {
      type: "PREMIUM",
      title: "Kimchi Stew",
      yieldQty: 4,
      yieldUnit: "SERVING",
      instructions: "Step 1\n\nStep 2",
    });

    expect(mockPrisma.marketplaceRecipe.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          instructions: "Step 1\n\nStep 2",
        }),
      })
    );
  });

  it("creates a BASIC recipe with PUBLISHED status", async () => {
    mockPrisma.ingredient.findMany.mockResolvedValue([]);
    const basicRow = {
      ...mockRecipeRow,
      type: "BASIC",
      status: "PUBLISHED",
      providerId: null,
      salePrice: 0,
      publishedAt: new Date(),
      ingredients: [],
    };
    mockPrisma.marketplaceRecipe.create.mockResolvedValue(basicRow);
    mockPrisma.marketplaceRecipe.update.mockResolvedValue(basicRow);

    const result = await createMarketplaceRecipe(CREATOR_ID, null, {
      type: "BASIC",
      title: "Basic Pasta",
      yieldQty: 2,
      yieldUnit: "SERVING",
    });

    expect(result.type).toBe("BASIC");
    expect(mockPrisma.marketplaceRecipe.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          type: "BASIC",
          status: "PUBLISHED",
          providerId: null,
          salePrice: 0,
        }),
      })
    );
  });

  it("snapshots ingredient unit costs using referencePrice at creation time", async () => {
    mockPrisma.ingredient.findMany.mockResolvedValue([{ id: "pi-1" }]);
    mockPrisma.ingredientSupplierLink.findMany.mockResolvedValue([
      {
        ingredientId: "pi-1",
        supplierProduct: { referencePrice: 15000 },
      },
    ]);
    const withIngredient = {
      ...mockRecipeRow,
      ingredients: [
        { ...mockIngredientRow, unitCostSnapshot: 15000, ingredient: { name: "Kimchi", unitCost: 15000 } },
      ],
    };
    mockPrisma.marketplaceRecipe.create.mockResolvedValue(withIngredient);
    mockPrisma.marketplaceRecipe.update.mockResolvedValue(mockRecipeRow);

    await createMarketplaceRecipe(CREATOR_ID, PROVIDER_ID, {
      type: "PREMIUM",
      title: "Test Recipe",
      yieldQty: 1,
      yieldUnit: "EACH",
      ingredients: [{ ingredientId: "pi-1", quantity: 100, unit: "GRAM" }],
    });

    expect(mockPrisma.marketplaceRecipe.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          ingredients: expect.objectContaining({
            create: expect.arrayContaining([
              expect.objectContaining({ unitCostSnapshot: 15000 }),
            ]),
          }),
        }),
      })
    );
  });
});

// ─── updateMarketplaceRecipe ──────────────────────────────────────────────────

describe("updateMarketplaceRecipe", () => {
  it("updates title and returns detail", async () => {
    mockPrisma.marketplaceRecipe.findFirst.mockResolvedValue(mockRecipeRow);
    mockPrisma.marketplaceRecipe.update.mockResolvedValue({
      ...mockRecipeRow,
      title: "Army Stew",
      ingredients: [],
    });

    const result = await updateMarketplaceRecipe("recipe-1", {
      title: "Army Stew",
    });

    expect(result.title).toBe("Army Stew");
  });

  it("updates instructions", async () => {
    mockPrisma.marketplaceRecipe.findFirst.mockResolvedValue(mockRecipeRow);
    mockPrisma.marketplaceRecipe.update.mockResolvedValue({
      ...mockRecipeRow,
      instructions: "Updated instructions.",
      ingredients: [],
    });

    await updateMarketplaceRecipe("recipe-1", {
      instructions: "Updated instructions.",
    });

    expect(mockPrisma.marketplaceRecipe.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ instructions: "Updated instructions." }),
      })
    );
  });

  it("throws when recipe not found", async () => {
    mockPrisma.marketplaceRecipe.findFirst.mockResolvedValue(null);

    await expect(
      updateMarketplaceRecipe("nonexistent", { title: "X" })
    ).rejects.toThrow("MarketplaceRecipe nonexistent not found");
  });
});

// ─── deleteMarketplaceRecipe ──────────────────────────────────────────────────

describe("deleteMarketplaceRecipe", () => {
  it("soft-deletes the recipe", async () => {
    mockPrisma.marketplaceRecipe.findFirst.mockResolvedValue(mockRecipeRow);
    mockPrisma.marketplaceRecipe.update.mockResolvedValue({
      ...mockRecipeRow,
      deletedAt: new Date(),
    });

    await deleteMarketplaceRecipe("recipe-1");

    expect(mockPrisma.marketplaceRecipe.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "recipe-1" },
        data: expect.objectContaining({ deletedAt: expect.any(Date) }),
      })
    );
  });

  it("throws when not found", async () => {
    mockPrisma.marketplaceRecipe.findFirst.mockResolvedValue(null);

    await expect(deleteMarketplaceRecipe("nonexistent")).rejects.toThrow(
      "MarketplaceRecipe nonexistent not found"
    );
  });
});

// ─── keyword search (q filter) ───────────────────────────────────────────────

describe("listMarketplaceRecipes — keyword search", () => {
  it("applies OR filter on title and description when q is provided", async () => {
    mockPrisma.marketplaceRecipe.findMany.mockResolvedValue([mockRecipeRow]);
    mockPrisma.marketplaceRecipe.count.mockResolvedValue(1);

    await listMarketplaceRecipes({ q: "kimchi" });

    expect(mockPrisma.marketplaceRecipe.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: expect.arrayContaining([
            expect.objectContaining({
              title: expect.objectContaining({
                contains: "kimchi",
                mode: "insensitive",
              }),
            }),
            expect.objectContaining({
              description: expect.objectContaining({
                contains: "kimchi",
                mode: "insensitive",
              }),
            }),
          ]),
        }),
      })
    );
  });

  it("does not apply OR filter when q is empty string", async () => {
    mockPrisma.marketplaceRecipe.findMany.mockResolvedValue([]);
    mockPrisma.marketplaceRecipe.count.mockResolvedValue(0);

    await listMarketplaceRecipes({ q: "" });

    const callArg = mockPrisma.marketplaceRecipe.findMany.mock.calls[0][0];
    expect(callArg.where).not.toHaveProperty("OR");
  });

  it("does not apply OR filter when q is whitespace only", async () => {
    mockPrisma.marketplaceRecipe.findMany.mockResolvedValue([]);
    mockPrisma.marketplaceRecipe.count.mockResolvedValue(0);

    await listMarketplaceRecipes({ q: "   " });

    const callArg = mockPrisma.marketplaceRecipe.findMany.mock.calls[0][0];
    expect(callArg.where).not.toHaveProperty("OR");
  });

  it("combines q with type and status filters", async () => {
    mockPrisma.marketplaceRecipe.findMany.mockResolvedValue([]);
    mockPrisma.marketplaceRecipe.count.mockResolvedValue(0);

    await listMarketplaceRecipes({
      q: "pasta",
      type: "BASIC",
      status: "PUBLISHED",
    });

    expect(mockPrisma.marketplaceRecipe.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          type: "BASIC",
          status: "PUBLISHED",
          OR: expect.arrayContaining([
            expect.objectContaining({
              title: expect.objectContaining({ contains: "pasta" }),
            }),
          ]),
        }),
      })
    );
  });

  it("returns empty list when no recipes match the keyword", async () => {
    mockPrisma.marketplaceRecipe.findMany.mockResolvedValue([]);
    mockPrisma.marketplaceRecipe.count.mockResolvedValue(0);

    const result = await listMarketplaceRecipes({ q: "nonexistentkeyword" });

    expect(result.items).toHaveLength(0);
    expect(result.total).toBe(0);
  });
});
