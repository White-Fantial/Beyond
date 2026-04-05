"use client";

import { useState } from "react";
import type { ReferralStats } from "@/types/customer-referrals";

interface Props {
  stats: ReferralStats;
}

export default function ReferralCard({ stats }: Props) {
  const [copied, setCopied] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  const shareLink =
    typeof window !== "undefined"
      ? `${window.location.origin}/app?ref=${stats.code.code}`
      : `/app?ref=${stats.code.code}`;

  async function handleCopyCode() {
    await navigator.clipboard.writeText(stats.code.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleCopyLink() {
    const url =
      typeof window !== "undefined"
        ? `${window.location.origin}/app?ref=${stats.code.code}`
        : shareLink;
    await navigator.clipboard.writeText(url);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm space-y-4">
      <div>
        <h2 className="text-base font-semibold text-gray-900">Your Referral Code</h2>
        <p className="text-sm text-gray-500 mt-0.5">
          Share your code and earn {stats.code.rewardPoints} points for each friend who joins.
        </p>
      </div>

      {/* Code display */}
      <div className="flex items-center gap-3">
        <div className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 text-center">
          <span className="text-xl font-bold tracking-widest text-brand-700">
            {stats.code.code}
          </span>
        </div>
        <button
          onClick={handleCopyCode}
          className="px-4 py-2.5 rounded-lg bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 transition min-w-[80px]"
        >
          {copied ? "Copied!" : "Copy Code"}
        </button>
      </div>

      {/* Share link */}
      <button
        onClick={handleCopyLink}
        className="w-full text-sm text-brand-600 hover:text-brand-800 font-medium text-left"
      >
        {linkCopied ? "✅ Link copied!" : "🔗 Copy share link"}
      </button>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-4 pt-2 border-t border-gray-100">
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-900">{stats.totalReferrals}</div>
          <div className="text-xs text-gray-500 mt-0.5">Referrals made</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-brand-600">{stats.pointsEarned}</div>
          <div className="text-xs text-gray-500 mt-0.5">Points earned</div>
        </div>
      </div>
    </div>
  );
}
