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
};

const PROVIDER_ID = "user-provider-1";
const CREATOR_ID = "user-admin-1";

const mockRecipeRow = {
  id: "recipe-1",
  type: "PREMIUM",
  status: "DRAFT",
  title: "김치찌개",
  description: "맛있는 김치찌개",
  thumbnailUrl: null,
  providerId: PROVIDER_ID,
  createdByUserId: CREATOR_ID,
  yieldQty: 4,
  yieldUnit: "SERVING",
  servings: 4,
  cuisineTag: "한식",
  difficulty: "EASY",
  prepTimeMinutes: 10,
  cookTimeMinutes: 20,
  currency: "USD",
  estimatedCostPrice: 0,
  recommendedPrice: 5000,
  salePrice: 4500,
  publishedAt: null,
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-01"),
  provider: { name: "레시피 제공자" },
};

const mockStep = {
  id: "step-1",
  recipeId: "recipe-1",
  stepNumber: 1,
  instruction: "김치를 썬다",
  imageUrl: null,
  durationMinutes: 5,
};

const mockIngredientRow = {
  id: "mri-1",
  recipeId: "recipe-1",
  ingredientId: "pi-1",
  quantity: { toNumber: () => 300 },
  unit: "GRAM",
  notes: null,
  unitCostSnapshot: 10,
  ingredient: { name: "김치" },
};

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── listMarketplaceRecipes ───────────────────────────────────────────────────

describe("listMarketplaceRecipes", () => {
  it("returns paginated recipes", async () => {
    mockPrisma.marketplaceRecipe.findMany.mockResolvedValue([mockRecipeRow]);
    mockPrisma.marketplaceRecipe.count.mockResolvedValue(1);

    const result = await listMarketplaceRecipes();

    expect(result.items).toHaveLength(1);
    expect(result.total).toBe(1);
    expect(result.items[0].title).toBe("김치찌개");
    expect(result.items[0].providerName).toBe("레시피 제공자");
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
  it("returns recipe with steps and ingredients", async () => {
    mockPrisma.marketplaceRecipe.findFirst.mockResolvedValue({
      ...mockRecipeRow,
      steps: [mockStep],
      ingredients: [mockIngredientRow],
    });

    const result = await getMarketplaceRecipe("recipe-1");

    expect(result.title).toBe("김치찌개");
    expect(result.steps).toHaveLength(1);
    expect(result.steps[0].instruction).toBe("김치를 썬다");
    expect(result.ingredients).toHaveLength(1);
    expect(result.ingredients[0].ingredientName).toBe("김치");
    expect(result.ingredients[0].lineCost).toBe(3000); // 300 * 10
    expect(result.ingredientCount).toBe(1);
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
      steps: [],
      ingredients: [],
    });
    mockPrisma.marketplaceRecipe.update.mockResolvedValue(mockRecipeRow);

    const result = await createMarketplaceRecipe(CREATOR_ID, PROVIDER_ID, {
      type: "PREMIUM",
      title: "김치찌개",
      yieldQty: 4,
      yieldUnit: "SERVING",
      salePrice: 4500,
      recommendedPrice: 5000,
    });

    expect(result.title).toBe("김치찌개");
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

  it("creates a BASIC recipe with PUBLISHED status", async () => {
    mockPrisma.ingredient.findMany.mockResolvedValue([]);
    const basicRow = {
      ...mockRecipeRow,
      type: "BASIC",
      status: "PUBLISHED",
      providerId: null,
      salePrice: 0,
      publishedAt: new Date(),
      steps: [],
      ingredients: [],
    };
    mockPrisma.marketplaceRecipe.create.mockResolvedValue(basicRow);
    mockPrisma.marketplaceRecipe.update.mockResolvedValue(basicRow);

    const result = await createMarketplaceRecipe(CREATOR_ID, null, {
      type: "BASIC",
      title: "기본 파스타",
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

  it("snapshots ingredient unit costs at creation time", async () => {
    mockPrisma.ingredient.findMany.mockResolvedValue([
      { id: "pi-1", unitCost: 15 },
    ]);
    const withIngredient = {
      ...mockRecipeRow,
      steps: [],
      ingredients: [
        { ...mockIngredientRow, unitCostSnapshot: 15 },
      ],
    };
    mockPrisma.marketplaceRecipe.create.mockResolvedValue(withIngredient);
    mockPrisma.marketplaceRecipe.update.mockResolvedValue(mockRecipeRow);

    await createMarketplaceRecipe(CREATOR_ID, PROVIDER_ID, {
      type: "PREMIUM",
      title: "테스트",
      yieldQty: 1,
      yieldUnit: "EACH",
      ingredients: [{ ingredientId: "pi-1", quantity: 100, unit: "GRAM" }],
    });

    expect(mockPrisma.marketplaceRecipe.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          ingredients: expect.objectContaining({
            create: expect.arrayContaining([
              expect.objectContaining({ unitCostSnapshot: 15 }),
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
      title: "부대찌개",
      steps: [],
      ingredients: [],
    });

    const result = await updateMarketplaceRecipe("recipe-1", {
      title: "부대찌개",
    });

    expect(result.title).toBe("부대찌개");
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

    await listMarketplaceRecipes({ q: "김치" });

    expect(mockPrisma.marketplaceRecipe.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: expect.arrayContaining([
            expect.objectContaining({
              title: expect.objectContaining({
                contains: "김치",
                mode: "insensitive",
              }),
            }),
            expect.objectContaining({
              description: expect.objectContaining({
                contains: "김치",
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
      q: "파스타",
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
              title: expect.objectContaining({ contains: "파스타" }),
            }),
          ]),
        }),
      })
    );
  });

  it("returns empty list when no recipes match the keyword", async () => {
    mockPrisma.marketplaceRecipe.findMany.mockResolvedValue([]);
    mockPrisma.marketplaceRecipe.count.mockResolvedValue(0);

    const result = await listMarketplaceRecipes({ q: "존재하지않는키워드" });

    expect(result.items).toHaveLength(0);
    expect(result.total).toBe(0);
  });
});
