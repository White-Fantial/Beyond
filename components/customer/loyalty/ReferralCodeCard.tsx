"use client";

import { useState } from "react";
import type { ReferralCode } from "@/types/customer-loyalty";

interface Props {
  referralCode: ReferralCode;
}

export default function ReferralCodeCard({ referralCode }: Props) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(referralCode.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
      <h3 className="text-base font-semibold text-gray-900 mb-1">Your Referral Code</h3>
      <p className="text-sm text-gray-500 mb-4">
        Share this code with friends. You both earn {referralCode.rewardPoints} points when they
        sign up.
      </p>

      <div className="flex items-center gap-3">
        <div className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 text-center">
          <span className="text-xl font-bold tracking-widest text-brand-700">
            {referralCode.code}
          </span>
        </div>
        <button
          onClick={handleCopy}
          className="px-4 py-2.5 rounded-lg bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 transition min-w-[80px]"
        >
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>

      <p className="text-xs text-gray-400 mt-3">
        Used {referralCode.usedCount} {referralCode.usedCount === 1 ? "time" : "times"}
      </p>
    </div>
  );
}
