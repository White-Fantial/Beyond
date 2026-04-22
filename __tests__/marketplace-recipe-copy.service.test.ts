import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    marketplaceRecipe: {
      findFirst: vi.fn(),
    },
    marketplaceRecipePurchase: {
      findFirst: vi.fn(),
    },
    recipe: {
      create: vi.fn(),
    },
  },
}));

vi.mock("@/services/owner/owner-supplier-prices.service", () => ({
  resolveEffectiveCostsBulk: vi.fn().mockResolvedValue(new Map()),
}));

import { prisma } from "@/lib/prisma";
import { copyMarketplaceRecipeToOwner } from "@/services/owner/owner-recipes.service";

const mockPrisma = prisma as unknown as {
  marketplaceRecipe: { findFirst: ReturnType<typeof vi.fn> };
  marketplaceRecipePurchase: { findFirst: ReturnType<typeof vi.fn> };
  recipe: { create: ReturnType<typeof vi.fn> };
};

const TENANT_ID = "tenant-1";
const USER_ID = "user-buyer-1";
const STORE_ID = "store-1";
const MARKETPLACE_RECIPE_ID = "mrecipe-1";

const mockIngredientShape = {
  name: "Flour",
  unit: "GRAM",
  supplierLinks: [],
};

const mockMarketplaceRecipeBasic = {
  id: MARKETPLACE_RECIPE_ID,
  type: "BASIC",
  status: "PUBLISHED",
  title: "Basic Pasta",
  description: "Tasty pasta recipe",
  instructions: "Boil water.\n\nAdd pasta and cook for 10 minutes.",
  yieldQty: 2,
  yieldUnit: "SERVING",
  deletedAt: null,
  ingredients: [
    {
      ingredientId: "ing-1",
      quantity: { toNumber: () => 200 },
      unit: "GRAM",
      ingredient: mockIngredientShape,
    },
  ],
};

const mockMarketplaceRecipePremium = {
  ...mockMarketplaceRecipeBasic,
  id: "mrecipe-premium-1",
  type: "PREMIUM",
  title: "Premium Kimchi Stew",
  description: "Secret recipe",
};

const mockCreatedRecipeRow = {
  id: "recipe-copy-1",
  tenantId: TENANT_ID,
  storeId: STORE_ID,
  catalogProductId: null,
  tenantCatalogProductId: null,
  categoryId: null,
  name: "Basic Pasta",
  yieldQty: 2,
  yieldUnit: "SERVING",
  notes: "Tasty pasta recipe",
  instructions: "Boil water.\n\nAdd pasta and cook for 10 minutes.",
  marketplaceSourceId: MARKETPLACE_RECIPE_ID,
  createdAt: new Date("2026-04-19"),
  updatedAt: new Date("2026-04-19"),
  catalogProduct: null,
  ingredients: [
    {
      id: "ri-1",
      recipeId: "recipe-copy-1",
      ingredientId: "ing-1",
      quantity: { toNumber: () => 200 },
      unit: "GRAM",
      ingredient: mockIngredientShape,
    },
  ],
};

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── copyMarketplaceRecipeToOwner ────────────────────────────────────────────

describe("copyMarketplaceRecipeToOwner", () => {
  it("copies a BASIC marketplace recipe without purchase check", async () => {
    mockPrisma.marketplaceRecipe.findFirst.mockResolvedValue(mockMarketplaceRecipeBasic);
    mockPrisma.recipe.create.mockResolvedValue(mockCreatedRecipeRow);

    const result = await copyMarketplaceRecipeToOwner(TENANT_ID, USER_ID, MARKETPLACE_RECIPE_ID, {
      storeId: STORE_ID,
    });

    expect(mockPrisma.marketplaceRecipePurchase.findFirst).not.toHaveBeenCalled();
    expect(mockPrisma.recipe.create).toHaveBeenCalledOnce();
    expect(result.marketplaceSourceId).toBe(MARKETPLACE_RECIPE_ID);
    expect(result.name).toBe("Basic Pasta");
    expect(result.yieldQty).toBe(2);
    expect(result.yieldUnit).toBe("SERVING");
    expect(result.notes).toBe("Tasty pasta recipe");
    expect(result.storeId).toBe(STORE_ID);
    expect(result.tenantId).toBe(TENANT_ID);
    expect(result.ingredients).toHaveLength(1);
  });

  it("uses provided name override instead of marketplace recipe title", async () => {
    mockPrisma.marketplaceRecipe.findFirst.mockResolvedValue(mockMarketplaceRecipeBasic);
    mockPrisma.recipe.create.mockResolvedValue({
      ...mockCreatedRecipeRow,
      name: "My Custom Pasta",
    });

    const result = await copyMarketplaceRecipeToOwner(TENANT_ID, USER_ID, MARKETPLACE_RECIPE_ID, {
      storeId: STORE_ID,
      name: "My Custom Pasta",
    });

    const createCall = mockPrisma.recipe.create.mock.calls[0][0];
    expect(createCall.data.name).toBe("My Custom Pasta");
    expect(result.name).toBe("My Custom Pasta");
  });

  it("copies a PREMIUM recipe when the user has a valid purchase", async () => {
    mockPrisma.marketplaceRecipe.findFirst.mockResolvedValue(mockMarketplaceRecipePremium);
    mockPrisma.marketplaceRecipePurchase.findFirst.mockResolvedValue({
      id: "purchase-1",
      recipeId: "mrecipe-premium-1",
      buyerUserId: USER_ID,
      refundedAt: null,
    });
    mockPrisma.recipe.create.mockResolvedValue({
      ...mockCreatedRecipeRow,
      id: "recipe-premium-copy-1",
      name: "Premium Kimchi Stew",
      marketplaceSourceId: "mrecipe-premium-1",
      notes: "Secret recipe",
    });

    const result = await copyMarketplaceRecipeToOwner(TENANT_ID, USER_ID, "mrecipe-premium-1", {
      storeId: STORE_ID,
    });

    expect(mockPrisma.marketplaceRecipePurchase.findFirst).toHaveBeenCalledWith({
      where: { recipeId: "mrecipe-premium-1", buyerUserId: USER_ID, refundedAt: null },
    });
    expect(result.marketplaceSourceId).toBe("mrecipe-premium-1");
  });

  it("throws when a PREMIUM recipe has not been purchased", async () => {
    mockPrisma.marketplaceRecipe.findFirst.mockResolvedValue(mockMarketplaceRecipePremium);
    mockPrisma.marketplaceRecipePurchase.findFirst.mockResolvedValue(null);

    await expect(
      copyMarketplaceRecipeToOwner(TENANT_ID, USER_ID, "mrecipe-premium-1", {
        storeId: STORE_ID,
      })
    ).rejects.toThrow("not purchased");

    expect(mockPrisma.recipe.create).not.toHaveBeenCalled();
  });

  it("throws when the marketplace recipe does not exist", async () => {
    mockPrisma.marketplaceRecipe.findFirst.mockResolvedValue(null);

    await expect(
      copyMarketplaceRecipeToOwner(TENANT_ID, USER_ID, "nonexistent", {
        storeId: STORE_ID,
      })
    ).rejects.toThrow("not found");
  });

  it("sets marketplaceSourceId on the created recipe row", async () => {
    mockPrisma.marketplaceRecipe.findFirst.mockResolvedValue(mockMarketplaceRecipeBasic);
    mockPrisma.recipe.create.mockResolvedValue(mockCreatedRecipeRow);

    await copyMarketplaceRecipeToOwner(TENANT_ID, USER_ID, MARKETPLACE_RECIPE_ID, {
      storeId: STORE_ID,
    });

    const createCall = mockPrisma.recipe.create.mock.calls[0][0];
    expect(createCall.data.marketplaceSourceId).toBe(MARKETPLACE_RECIPE_ID);
  });

  it("links the copied recipe to a product when catalogProductId is provided", async () => {
    const PRODUCT_ID = "product-abc";
    mockPrisma.marketplaceRecipe.findFirst.mockResolvedValue(mockMarketplaceRecipeBasic);
    mockPrisma.recipe.create.mockResolvedValue({
      ...mockCreatedRecipeRow,
      catalogProductId: PRODUCT_ID,
    });

    const result = await copyMarketplaceRecipeToOwner(TENANT_ID, USER_ID, MARKETPLACE_RECIPE_ID, {
      storeId: STORE_ID,
      catalogProductId: PRODUCT_ID,
    });

    const createCall = mockPrisma.recipe.create.mock.calls[0][0];
    expect(createCall.data.catalogProductId).toBe(PRODUCT_ID);
    expect(result.catalogProductId).toBe(PRODUCT_ID);
  });

  it("sets catalogProductId to null when not provided", async () => {
    mockPrisma.marketplaceRecipe.findFirst.mockResolvedValue(mockMarketplaceRecipeBasic);
    mockPrisma.recipe.create.mockResolvedValue(mockCreatedRecipeRow);

    await copyMarketplaceRecipeToOwner(TENANT_ID, USER_ID, MARKETPLACE_RECIPE_ID, {
      storeId: STORE_ID,
    });

    const createCall = mockPrisma.recipe.create.mock.calls[0][0];
    expect(createCall.data.catalogProductId).toBeNull();
  });

  it("links the copied recipe to a tenant catalog product when tenantCatalogProductId is provided", async () => {
    const TENANT_PRODUCT_ID = "tp-abc";
    mockPrisma.marketplaceRecipe.findFirst.mockResolvedValue(mockMarketplaceRecipeBasic);
    mockPrisma.recipe.create.mockResolvedValue({
      ...mockCreatedRecipeRow,
      tenantCatalogProductId: TENANT_PRODUCT_ID,
    });

    const result = await copyMarketplaceRecipeToOwner(TENANT_ID, USER_ID, MARKETPLACE_RECIPE_ID, {
      storeId: STORE_ID,
      tenantCatalogProductId: TENANT_PRODUCT_ID,
    });

    const createCall = mockPrisma.recipe.create.mock.calls[0][0];
    expect(createCall.data.tenantCatalogProductId).toBe(TENANT_PRODUCT_ID);
    expect(result.tenantCatalogProductId).toBe(TENANT_PRODUCT_ID);
  });

  it("copies instructions from the marketplace recipe to the owner recipe", async () => {
    mockPrisma.marketplaceRecipe.findFirst.mockResolvedValue(mockMarketplaceRecipeBasic);
    mockPrisma.recipe.create.mockResolvedValue(mockCreatedRecipeRow);

    const result = await copyMarketplaceRecipeToOwner(TENANT_ID, USER_ID, MARKETPLACE_RECIPE_ID, {
      storeId: STORE_ID,
    });

    const createCall = mockPrisma.recipe.create.mock.calls[0][0];
    expect(createCall.data.instructions).toBe("Boil water.\n\nAdd pasta and cook for 10 minutes.");
    expect(result.instructions).toBe("Boil water.\n\nAdd pasta and cook for 10 minutes.");
  });
});
