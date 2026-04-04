"use client";

import type { LoyaltySummary, LoyaltyTier } from "@/types/customer-loyalty";

const TIER_COLORS: Record<LoyaltyTier, string> = {
  BRONZE: "bg-amber-700",
  SILVER: "bg-gray-400",
  GOLD: "bg-yellow-500",
  PLATINUM: "bg-purple-600",
};

const TIER_TEXT: Record<LoyaltyTier, string> = {
  BRONZE: "text-amber-700",
  SILVER: "text-gray-600",
  GOLD: "text-yellow-600",
  PLATINUM: "text-purple-700",
};

interface Props {
  summary: LoyaltySummary;
}

export default function LoyaltySummaryCard({ summary }: Props) {
  const { account, nextTier, pointsToNextTier } = summary;
  const tierProgress =
    nextTier && pointsToNextTier !== null
      ? Math.round(((account.points) / nextTier.minPoints) * 100)
      : 100;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">My Loyalty Points</h2>
        <span
          className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold text-white ${
            TIER_COLORS[account.tier]
          }`}
        >
          {account.tier}
        </span>
      </div>

      <div className="mb-6">
        <p className={`text-5xl font-bold ${TIER_TEXT[account.tier]}`}>
          {account.points.toLocaleString()}
        </p>
        <p className="text-sm text-gray-500 mt-1">points available</p>
      </div>

      {nextTier && pointsToNextTier !== null ? (
        <div>
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>Progress to {nextTier.label}</span>
            <span>{pointsToNextTier.toLocaleString()} pts to go</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2">
            <div
              className="bg-brand-600 h-2 rounded-full transition-all"
              style={{ width: `${Math.min(tierProgress, 100)}%` }}
            />
          </div>
        </div>
      ) : (
        <p className="text-sm text-purple-600 font-medium">🎉 You&apos;ve reached Platinum!</p>
      )}
    </div>
  );
}
