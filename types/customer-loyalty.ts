// Customer Portal Phase 3 — Loyalty types

export type LoyaltyTier = "BRONZE" | "SILVER" | "GOLD" | "PLATINUM";

export type LoyaltyTransactionType = "EARN" | "REDEEM" | "ADJUSTMENT";

export interface LoyaltyTierThreshold {
  tier: LoyaltyTier;
  minPoints: number;
  label: string;
}

export interface LoyaltyAccount {
  id: string;
  userId: string;
  points: number;
  tier: LoyaltyTier;
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
}

export interface LoyaltyTransaction {
  id: string;
  accountId: string;
  orderId: string | null;
  type: LoyaltyTransactionType;
  pointsDelta: number;
  description: string | null;
  createdAt: string; // ISO 8601
}

export interface LoyaltyTransactionListResult {
  items: LoyaltyTransaction[];
  total: number;
  page: number;
  pageSize: number;
}

export interface LoyaltySummary {
  account: LoyaltyAccount;
  nextTier: LoyaltyTierThreshold | null;
  pointsToNextTier: number | null;
  referralCode: string | null;
}

export interface LoyaltyTransactionListOptions {
  type?: LoyaltyTransactionType;
  page?: number;
  pageSize?: number;
}

export interface ReferralCode {
  id: string;
  userId: string;
  code: string;
  usedCount: number;
  rewardPoints: number;
  createdAt: string; // ISO 8601
}
