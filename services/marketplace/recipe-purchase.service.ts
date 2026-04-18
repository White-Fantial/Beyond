/**
 * Recipe Purchase Service — Marketplace.
 *
 * Handles purchasing premium recipes and checking access rights.
 * Access rules:
 *   - BASIC recipe:   any authenticated user
 *   - PREMIUM recipe: the provider, any admin/moderator, or a user with a purchase record
 */
import { prisma } from "@/lib/prisma";
import type {
  MarketplaceRecipePurchase,
  PurchaseRecipeInput,
  RecipeAccessResult,
} from "@/types/marketplace";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toPurchase(row: {
  id: string;
  recipeId: string;
  buyerUserId: string;
  tenantId: string | null;
  pricePaid: number;
  currency: string;
  paymentRef: string | null;
  purchasedAt: Date;
  refundedAt: Date | null;
}): MarketplaceRecipePurchase {
  return {
    id: row.id,
    recipeId: row.recipeId,
    buyerUserId: row.buyerUserId,
    tenantId: row.tenantId,
    pricePaid: row.pricePaid,
    currency: row.currency,
    paymentRef: row.paymentRef,
    purchasedAt: row.purchasedAt.toISOString(),
    refundedAt: row.refundedAt?.toISOString() ?? null,
  };
}

// ─── Public functions ─────────────────────────────────────────────────────────

/** Check whether a user has access to the full content of a recipe. */
export async function checkRecipeAccess(
  recipeId: string,
  userId: string,
  platformRole: string
): Promise<RecipeAccessResult> {
  const recipe = await prisma.marketplaceRecipe.findFirst({
    where: { id: recipeId, deletedAt: null },
    select: { type: true, providerId: true, status: true },
  });
  if (!recipe) throw new Error(`MarketplaceRecipe ${recipeId} not found`);

  // BASIC recipes are freely accessible to all authenticated users
  if (recipe.type === "BASIC") {
    return { hasAccess: true, reason: "basic" };
  }

  // PREMIUM: admin and moderators always have full access
  if (platformRole === "PLATFORM_ADMIN" || platformRole === "PLATFORM_MODERATOR") {
    return { hasAccess: true, reason: "admin" };
  }

  // PREMIUM: the provider always has access to their own recipe
  if (recipe.providerId === userId) {
    return { hasAccess: true, reason: "provider" };
  }

  // PREMIUM: check for purchase record (not refunded)
  const purchase = await prisma.marketplaceRecipePurchase.findFirst({
    where: { recipeId, buyerUserId: userId, refundedAt: null },
  });
  if (purchase) {
    return { hasAccess: true, reason: "purchased" };
  }

  return { hasAccess: false, reason: "not_purchased" };
}

/** Purchase a premium recipe. */
export async function purchaseRecipe(
  recipeId: string,
  buyerUserId: string,
  input: PurchaseRecipeInput = {}
): Promise<MarketplaceRecipePurchase> {
  const recipe = await prisma.marketplaceRecipe.findFirst({
    where: { id: recipeId, deletedAt: null },
    select: { type: true, status: true, salePrice: true, currency: true },
  });
  if (!recipe) throw new Error(`MarketplaceRecipe ${recipeId} not found`);

  if (recipe.type === "BASIC") {
    throw new Error("BASIC recipes are free and do not require purchase");
  }
  if (recipe.status !== "PUBLISHED") {
    throw new Error("Recipe is not available for purchase");
  }

  // Prevent duplicate purchases
  const existing = await prisma.marketplaceRecipePurchase.findFirst({
    where: { recipeId, buyerUserId, refundedAt: null },
  });
  if (existing) throw new Error("Recipe already purchased");

  const row = await prisma.marketplaceRecipePurchase.create({
    data: {
      recipeId,
      buyerUserId,
      tenantId: input.tenantId ?? null,
      pricePaid: recipe.salePrice,
      currency: recipe.currency,
      paymentRef: input.paymentRef ?? null,
    },
  });

  return toPurchase(row);
}

/** List all purchases for a given user. */
export async function listUserPurchases(
  buyerUserId: string
): Promise<MarketplaceRecipePurchase[]> {
  const rows = await prisma.marketplaceRecipePurchase.findMany({
    where: { buyerUserId },
    orderBy: { purchasedAt: "desc" },
  });
  return rows.map(toPurchase);
}
