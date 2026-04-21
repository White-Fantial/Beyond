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

const mockIngredient = {
  id: "ing-1",
  name: "밀가루",
  unit: "GRAM",
  unitCost: 10,
};

const mockMarketplaceRecipeBasic = {
  id: MARKETPLACE_RECIPE_ID,
  type: "BASIC",
  status: "PUBLISHED",
  title: "기본 파스타",
  description: "맛있는 파스타 레시피",
  yieldQty: 2,
  yieldUnit: "SERVING",
  deletedAt: null,
  ingredients: [
    {
      ingredientId: "ing-1",
      quantity: { toNumber: () => 200 },
      unit: "GRAM",
      ingredient: { name: "밀가루", unit: "GRAM", unitCost: 10 },
    },
  ],
};

const mockMarketplaceRecipePremium = {
  ...mockMarketplaceRecipeBasic,
  id: "mrecipe-premium-1",
  type: "PREMIUM",
  title: "프리미엄 김치찌개",
  description: "비법 레시피",
};

const mockCreatedRecipeRow = {
  id: "recipe-copy-1",
  tenantId: TENANT_ID,
  storeId: STORE_ID,
  catalogProductId: null,
  name: "기본 파스타",
  yieldQty: 2,
  yieldUnit: "SERVING",
  notes: "맛있는 파스타 레시피",
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
      ingredient: { name: "밀가루", unit: "GRAM", unitCost: 10 },
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
    expect(result.name).toBe("기본 파스타");
    expect(result.yieldQty).toBe(2);
    expect(result.yieldUnit).toBe("SERVING");
    expect(result.notes).toBe("맛있는 파스타 레시피");
    expect(result.storeId).toBe(STORE_ID);
    expect(result.tenantId).toBe(TENANT_ID);
    expect(result.ingredients).toHaveLength(1);
  });

  it("uses provided name override instead of marketplace recipe title", async () => {
    mockPrisma.marketplaceRecipe.findFirst.mockResolvedValue(mockMarketplaceRecipeBasic);
    mockPrisma.recipe.create.mockResolvedValue({
      ...mockCreatedRecipeRow,
      name: "나만의 파스타",
    });

    const result = await copyMarketplaceRecipeToOwner(TENANT_ID, USER_ID, MARKETPLACE_RECIPE_ID, {
      storeId: STORE_ID,
      name: "나만의 파스타",
    });

    const createCall = mockPrisma.recipe.create.mock.calls[0][0];
    expect(createCall.data.name).toBe("나만의 파스타");
    expect(result.name).toBe("나만의 파스타");
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
      name: "프리미엄 김치찌개",
      marketplaceSourceId: "mrecipe-premium-1",
      notes: "비법 레시피",
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
});
