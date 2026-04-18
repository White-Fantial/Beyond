// ─── Provider Onboarding Types ────────────────────────────────────────────────

export type ProviderApplicationStatus = "PENDING" | "APPROVED" | "REJECTED";
export type ProviderBusinessType = "INDIVIDUAL" | "COMPANY";

export const PROVIDER_APPLICATION_STATUS_LABELS: Record<
  ProviderApplicationStatus,
  string
> = {
  PENDING: "검토 대기",
  APPROVED: "승인됨",
  REJECTED: "반려됨",
};

export interface ProviderOnboardingApplication {
  id: string;
  userId: string;
  applicantName: string;
  applicantEmail: string;
  businessName: string;
  businessType: ProviderBusinessType;
  taxId: string | null;
  portfolioUrl: string | null;
  introduction: string | null;
  status: ProviderApplicationStatus;
  adminNotes: string | null;
  createdAt: string;
  updatedAt: string;
  reviewedAt: string | null;
  reviewedByUserId: string | null;
}

export interface ProviderApplicationListResult {
  items: ProviderOnboardingApplication[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ApplyForProviderInput {
  businessName: string;
  businessType?: ProviderBusinessType;
  taxId?: string;
  portfolioUrl?: string;
  introduction?: string;
}

export interface ReviewProviderApplicationInput {
  status: "APPROVED" | "REJECTED";
  adminNotes?: string;
}

export interface ProviderApplicationFilters {
  status?: ProviderApplicationStatus;
  page?: number;
  pageSize?: number;
}

// ─── Provider Stripe Connect Status ──────────────────────────────────────────

export interface ProviderStripeStatus {
  hasAccount: boolean;
  accountId: string | null;
  onboarded: boolean;
  payoutsEnabled: boolean;
}

// ─── Provider Earnings ────────────────────────────────────────────────────────

export type RecipePayoutStatus = "PENDING" | "TRANSFERRED" | "FAILED";

export interface ProviderEarningItem {
  purchaseId: string;
  recipeId: string;
  recipeTitle: string;
  buyerUserId: string;
  pricePaid: number;
  currency: string;
  platformFeeAmount: number;
  providerPayoutAmount: number;
  payoutStatus: RecipePayoutStatus;
  purchasedAt: string;
  transferredAt: string | null;
  stripeTransferId: string | null;
}

export interface ProviderEarningsSummary {
  totalSales: number;
  totalRevenue: number;
  totalPlatformFees: number;
  totalPayoutAmount: number;
  pendingPayoutAmount: number;
  currency: string;
}

export interface ProviderEarningsResult {
  items: ProviderEarningItem[];
  summary: ProviderEarningsSummary;
  total: number;
  page: number;
  pageSize: number;
}

export interface ProviderEarningsFilters {
  payoutStatus?: RecipePayoutStatus;
  page?: number;
  pageSize?: number;
}
