/**
 * Provider Earnings Service — Marketplace Phase 7.
 *
 * Lists a provider's recipe sale earnings, computes summary stats,
 * and triggers manual Stripe payouts for PENDING transfers.
 */
import { prisma } from "@/lib/prisma";
import type {
  ProviderEarningItem,
  ProviderEarningsSummary,
  ProviderEarningsResult,
  ProviderEarningsFilters,
  RecipePayoutStatus,
} from "@/types/provider-onboarding";

// ─── Helpers ──────────────────────────────────────────────────────────────────

type RawPurchase = {
  id: string;
  recipeId: string;
  buyerUserId: string;
  pricePaid: number;
  currency: string;
  platformFeeAmount: number;
  providerPayoutAmount: number;
  payoutStatus: string;
  purchasedAt: Date;
  transferredAt: Date | null;
  stripeTransferId: string | null;
  recipe?: { title: string } | null;
};

function toEarningItem(row: RawPurchase): ProviderEarningItem {
  return {
    purchaseId: row.id,
    recipeId: row.recipeId,
    recipeTitle: row.recipe?.title ?? "",
    buyerUserId: row.buyerUserId,
    pricePaid: row.pricePaid,
    currency: row.currency,
    platformFeeAmount: row.platformFeeAmount,
    providerPayoutAmount: row.providerPayoutAmount,
    payoutStatus: row.payoutStatus as RecipePayoutStatus,
    purchasedAt: row.purchasedAt.toISOString(),
    transferredAt: row.transferredAt?.toISOString() ?? null,
    stripeTransferId: row.stripeTransferId,
  };
}

function computeSummary(items: ProviderEarningItem[]): ProviderEarningsSummary {
  const currency = items[0]?.currency ?? "KRW";
  let totalRevenue = 0;
  let totalPlatformFees = 0;
  let totalPayoutAmount = 0;
  let pendingPayoutAmount = 0;

  for (const item of items) {
    totalRevenue += item.pricePaid;
    totalPlatformFees += item.platformFeeAmount;
    totalPayoutAmount += item.providerPayoutAmount;
    if (item.payoutStatus === "PENDING" || item.payoutStatus === "FAILED") {
      pendingPayoutAmount += item.providerPayoutAmount;
    }
  }

  return {
    totalSales: items.length,
    totalRevenue,
    totalPlatformFees,
    totalPayoutAmount,
    pendingPayoutAmount,
    currency,
  };
}

// ─── Public functions ─────────────────────────────────────────────────────────

/**
 * List a provider's recipe earnings with optional payout status filter.
 */
export async function listEarnings(
  providerId: string,
  filters: ProviderEarningsFilters = {}
): Promise<ProviderEarningsResult> {
  const { payoutStatus, page = 1, pageSize = 20 } = filters;
  const skip = (page - 1) * pageSize;

  // Only purchases for recipes owned by this provider
  const baseWhere = {
    recipe: { providerId },
    refundedAt: null,
    ...(payoutStatus ? { payoutStatus } : {}),
  };

  const [rows, total] = await Promise.all([
    prisma.marketplaceRecipePurchase.findMany({
      where: baseWhere,
      skip,
      take: pageSize,
      orderBy: { purchasedAt: "desc" },
      include: { recipe: { select: { title: true } } },
    }),
    prisma.marketplaceRecipePurchase.count({ where: baseWhere }),
  ]);

  const items = rows.map((r) =>
    toEarningItem({
      ...r,
      stripeTransferId: r.stripeTransferId ?? null,
      recipe: r.recipe,
    })
  );

  return {
    items,
    summary: computeSummary(items),
    total,
    page,
    pageSize,
  };
}

/**
 * Get a summary of all earnings for a provider (all-time).
 */
export async function getEarningsSummary(
  providerId: string
): Promise<ProviderEarningsSummary> {
  const rows = await prisma.marketplaceRecipePurchase.findMany({
    where: { recipe: { providerId }, refundedAt: null },
    select: {
      pricePaid: true,
      currency: true,
      platformFeeAmount: true,
      providerPayoutAmount: true,
      payoutStatus: true,
    },
  });

  const items = rows.map((r) => ({
    purchaseId: "",
    recipeId: "",
    recipeTitle: "",
    buyerUserId: "",
    pricePaid: r.pricePaid,
    currency: r.currency,
    platformFeeAmount: r.platformFeeAmount,
    providerPayoutAmount: r.providerPayoutAmount,
    payoutStatus: r.payoutStatus as RecipePayoutStatus,
    purchasedAt: "",
    transferredAt: null,
    stripeTransferId: null,
  }));

  return computeSummary(items);
}
