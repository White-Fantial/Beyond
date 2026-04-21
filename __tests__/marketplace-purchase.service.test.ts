import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    marketplaceRecipe: {
      findFirst: vi.fn(),
    },
    marketplaceRecipePurchase: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";
import {
  checkRecipeAccess,
  listUserPurchases,
} from "@/services/marketplace/recipe-purchase.service";

const mockPrisma = prisma as unknown as {
  marketplaceRecipe: {
    findFirst: ReturnType<typeof vi.fn>;
  };
  marketplaceRecipePurchase: {
    findFirst: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
  };
};

const BUYER_ID = "user-buyer-1";
const PROVIDER_ID = "user-provider-1";

const mockPublishedPremium = {
  id: "recipe-1",
  type: "PREMIUM",
  status: "PUBLISHED",
  providerId: PROVIDER_ID,
  salePrice: 5000,
  currency: "USD",
};

const mockBasicRecipe = {
  id: "recipe-basic-1",
  type: "BASIC",
  status: "PUBLISHED",
  providerId: null,
  salePrice: 0,
  currency: "USD",
};

const mockPurchaseRow = {
  id: "purchase-1",
  recipeId: "recipe-1",
  buyerUserId: BUYER_ID,
  tenantId: null,
  pricePaid: 5000,
  currency: "USD",
  paymentRef: null,
  purchasedAt: new Date("2026-02-01"),
  refundedAt: null,
};

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── checkRecipeAccess ────────────────────────────────────────────────────────

describe("checkRecipeAccess", () => {
  it("grants access to BASIC recipes for all users", async () => {
    mockPrisma.marketplaceRecipe.findFirst.mockResolvedValue(mockBasicRecipe);

    const result = await checkRecipeAccess("recipe-basic-1", BUYER_ID, "USER");
    expect(result.hasAccess).toBe(true);
    expect(result.reason).toBe("basic");
  });

  it("grants access to PLATFORM_ADMIN for any recipe", async () => {
    mockPrisma.marketplaceRecipe.findFirst.mockResolvedValue(
      mockPublishedPremium
    );

    const result = await checkRecipeAccess(
      "recipe-1",
      "admin-user",
      "PLATFORM_ADMIN"
    );
    expect(result.hasAccess).toBe(true);
    expect(result.reason).toBe("admin");
  });

  it("grants access to PLATFORM_MODERATOR for any recipe", async () => {
    mockPrisma.marketplaceRecipe.findFirst.mockResolvedValue(
      mockPublishedPremium
    );

    const result = await checkRecipeAccess(
      "recipe-1",
      "mod-user",
      "PLATFORM_MODERATOR"
    );
    expect(result.hasAccess).toBe(true);
    expect(result.reason).toBe("admin");
  });

  it("grants access to provider for their own recipe", async () => {
    mockPrisma.marketplaceRecipe.findFirst.mockResolvedValue(
      mockPublishedPremium
    );

    const result = await checkRecipeAccess(
      "recipe-1",
      PROVIDER_ID,
      "RECIPE_PROVIDER"
    );
    expect(result.hasAccess).toBe(true);
    expect(result.reason).toBe("provider");
  });

  it("grants access to user who purchased the recipe", async () => {
    mockPrisma.marketplaceRecipe.findFirst.mockResolvedValue(
      mockPublishedPremium
    );
    mockPrisma.marketplaceRecipePurchase.findFirst.mockResolvedValue(
      mockPurchaseRow
    );

    const result = await checkRecipeAccess("recipe-1", BUYER_ID, "USER");
    expect(result.hasAccess).toBe(true);
    expect(result.reason).toBe("purchased");
  });

  it("denies access to user who has not purchased", async () => {
    mockPrisma.marketplaceRecipe.findFirst.mockResolvedValue(
      mockPublishedPremium
    );
    mockPrisma.marketplaceRecipePurchase.findFirst.mockResolvedValue(null);

    const result = await checkRecipeAccess("recipe-1", BUYER_ID, "USER");
    expect(result.hasAccess).toBe(false);
    expect(result.reason).toBe("not_purchased");
  });

  it("throws when recipe not found", async () => {
    mockPrisma.marketplaceRecipe.findFirst.mockResolvedValue(null);

    await expect(
      checkRecipeAccess("nonexistent", BUYER_ID, "USER")
    ).rejects.toThrow("MarketplaceRecipe nonexistent not found");
  });
});

// ─── listUserPurchases ────────────────────────────────────────────────────────

describe("listUserPurchases", () => {
  it("returns purchases for a user", async () => {
    mockPrisma.marketplaceRecipePurchase.findMany.mockResolvedValue([
      mockPurchaseRow,
    ]);

    const result = await listUserPurchases(BUYER_ID);

    expect(result).toHaveLength(1);
    expect(result[0].recipeId).toBe("recipe-1");
    expect(typeof result[0].purchasedAt).toBe("string");
  });

  it("returns empty array when no purchases", async () => {
    mockPrisma.marketplaceRecipePurchase.findMany.mockResolvedValue([]);

    const result = await listUserPurchases(BUYER_ID);
    expect(result).toHaveLength(0);
  });
});
