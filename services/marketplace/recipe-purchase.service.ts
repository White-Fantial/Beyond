/**
 * Recipe Purchase Service — Marketplace.
 *
 * Handles purchasing premium recipes and checking access rights.
 * Access rules:
 *   - BASIC recipe:   any authenticated user
 *   - PREMIUM recipe: the provider, any admin/moderator, or a user with a purchase record
 *
 * Phase 7 additions:
 *   - createPurchaseIntent: creates a Stripe PaymentIntent (real payment flow)
 *   - handlePurchaseWebhook: processes payment_intent.succeeded webhook event
 */
import { prisma } from "@/lib/prisma";
import {
  createRecipePaymentIntent,
  createProviderTransfer,
  PLATFORM_FEE_PERCENT,
} from "@/lib/stripe/connect";
import type {
  MarketplaceRecipePurchase,
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

/**
 * Create a Stripe PaymentIntent for a premium recipe purchase.
 * Returns the clientSecret for Stripe.js on the frontend.
 * The purchase DB record is NOT created here — it is created in handlePurchaseWebhook
 * when Stripe fires the payment_intent.succeeded event.
 */
export async function createPurchaseIntent(
  recipeId: string,
  buyerUserId: string
): Promise<{ clientSecret: string; paymentIntentId: string; amount: number; currency: string }> {
  const recipe = await prisma.marketplaceRecipe.findFirst({
    where: { id: recipeId, deletedAt: null },
    select: {
      type: true,
      status: true,
      salePrice: true,
      currency: true,
      providerId: true,
    },
  });
  if (!recipe) throw new Error(`MarketplaceRecipe ${recipeId} not found`);

  if (recipe.type === "BASIC") {
    throw new Error("BASIC recipes are free and do not require purchase");
  }
  if (recipe.status !== "PUBLISHED") {
    throw new Error("Recipe is not available for purchase");
  }
  if (!recipe.providerId) {
    throw new Error("Recipe has no provider");
  }

  // Prevent duplicate purchases
  const existing = await prisma.marketplaceRecipePurchase.findFirst({
    where: { recipeId, buyerUserId, refundedAt: null },
  });
  if (existing) throw new Error("Recipe already purchased");

  // Fetch the provider's Stripe Connect account ID
  const provider = await prisma.user.findUnique({
    where: { id: recipe.providerId },
    select: { stripeConnectAccountId: true, stripeConnectPayoutsEnabled: true },
  });
  if (!provider?.stripeConnectAccountId) {
    throw new Error("Provider has not connected a Stripe account");
  }
  if (!provider.stripeConnectPayoutsEnabled) {
    throw new Error("Provider's Stripe account is not ready to receive payouts");
  }

  const { paymentIntentId, clientSecret } = await createRecipePaymentIntent({
    amount: recipe.salePrice,
    currency: recipe.currency,
    providerAccountId: provider.stripeConnectAccountId,
    recipeId,
    buyerUserId,
  });

  return {
    clientSecret,
    paymentIntentId,
    amount: recipe.salePrice,
    currency: recipe.currency,
  };
}

/**
 * Handle a Stripe payment_intent.succeeded webhook event.
 * Creates the purchase DB record and initiates the provider transfer.
 */
export async function handlePurchaseWebhook(event: {
  type: string;
  data: {
    object: {
      id: string;
      amount: number;
      currency: string;
      metadata: Record<string, string>;
    };
  };
}): Promise<void> {
  if (event.type !== "payment_intent.succeeded") return;

  const pi = event.data.object;
  const { recipeId, buyerUserId } = pi.metadata;

  if (!recipeId || !buyerUserId) {
    throw new Error("Webhook event missing recipeId or buyerUserId in metadata");
  }

  // Idempotency: skip if already recorded
  const alreadyRecorded = await prisma.marketplaceRecipePurchase.findFirst({
    where: { stripePaymentIntentId: pi.id },
  });
  if (alreadyRecorded) return;

  const recipe = await prisma.marketplaceRecipe.findFirst({
    where: { id: recipeId },
    select: { salePrice: true, currency: true, providerId: true },
  });
  if (!recipe) throw new Error(`MarketplaceRecipe ${recipeId} not found in webhook`);

  const pricePaid = pi.amount;
  const platformFeeAmount = Math.round(pricePaid * PLATFORM_FEE_PERCENT / 100);
  const providerPayoutAmount = pricePaid - platformFeeAmount;

  // Create the purchase record
  const purchase = await prisma.marketplaceRecipePurchase.create({
    data: {
      recipeId,
      buyerUserId,
      pricePaid,
      currency: pi.currency.toUpperCase(),
      stripePaymentIntentId: pi.id,
      platformFeeAmount,
      providerPayoutAmount,
      payoutStatus: "PENDING",
    },
  });

  // Attempt provider transfer if the provider has a Stripe account
  if (recipe.providerId) {
    const provider = await prisma.user.findUnique({
      where: { id: recipe.providerId },
      select: { stripeConnectAccountId: true, stripeConnectPayoutsEnabled: true },
    });

    if (provider?.stripeConnectAccountId && provider.stripeConnectPayoutsEnabled) {
      try {
        const { transferId } = await createProviderTransfer({
          amount: providerPayoutAmount,
          currency: pi.currency,
          destination: provider.stripeConnectAccountId,
          purchaseId: purchase.id,
        });

        await prisma.marketplaceRecipePurchase.update({
          where: { id: purchase.id },
          data: {
            stripeTransferId: transferId,
            payoutStatus: "TRANSFERRED",
            transferredAt: new Date(),
          },
        });
      } catch {
        await prisma.marketplaceRecipePurchase.update({
          where: { id: purchase.id },
          data: { payoutStatus: "FAILED" },
        });
      }
    }
    // If provider not ready, purchase stays PENDING — admin can retry later
  }
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

