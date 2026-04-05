"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { GiftCardDetail } from "@/types/owner-gift-cards";

interface Props {
  detail: GiftCardDetail;
}

function formatAmount(minor: number) {
  return `$${(minor / 100).toFixed(2)}`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-NZ", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

const TYPE_LABELS: Record<string, string> = {
  ISSUE: "Issued",
  REDEEM: "Redeemed",
  REFUND: "Refunded",
  VOID: "Voided",
};

export default function GiftCardDetailView({ detail }: Props) {
  const router = useRouter();
  const [voiding, setVoiding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleVoid() {
    if (!confirm("Are you sure you want to void this gift card? This cannot be undone.")) return;
    setVoiding(true);
    setError(null);
    try {
      const res = await fetch(`/api/owner/gift-cards/${detail.id}/void`, { method: "POST" });
      if (!res.ok) {
        const body = await res.json();
        setError(body.error ?? "Failed to void gift card");
        return;
      }
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setVoiding(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Summary card */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div>
          <p className="text-xs text-gray-500">Initial Value</p>
          <p className="text-lg font-bold text-gray-900 mt-1">{formatAmount(detail.initialValue)}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Remaining Balance</p>
          <p className="text-lg font-bold text-brand-700 mt-1">{formatAmount(detail.currentBalance)}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Issued To</p>
          <p className="text-sm font-medium text-gray-900 mt-1">{detail.issuedToEmail ?? "—"}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Status</p>
          <p className="mt-1">
            {detail.isVoided ? (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">Voided</span>
            ) : (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">Active</span>
            )}
          </p>
        </div>
      </div>

      {/* Actions */}
      {!detail.isVoided && (
        <div>
          {error && <p className="text-sm text-red-600 mb-2">{error}</p>}
          <button
            onClick={handleVoid}
            disabled={voiding}
            className="px-4 py-2 text-sm font-medium text-red-600 border border-red-300 rounded-lg hover:bg-red-50 disabled:opacity-50 transition"
          >
            {voiding ? "Voiding…" : "Void Gift Card"}
          </button>
        </div>
      )}

      {/* Transaction ledger */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-900">Transaction Ledger</h3>
        </div>
        {detail.transactions.length === 0 ? (
          <div className="p-6 text-sm text-gray-500 text-center">No transactions yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-500 bg-gray-50">
                  <th className="px-5 py-2.5 text-left font-medium">Date</th>
                  <th className="px-5 py-2.5 text-left font-medium">Type</th>
                  <th className="px-5 py-2.5 text-right font-medium">Amount</th>
                  <th className="px-5 py-2.5 text-left font-medium">Note</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {detail.transactions.map((tx) => (
                  <tr key={tx.id}>
                    <td className="px-5 py-3 text-gray-600 whitespace-nowrap">{formatDate(tx.createdAt)}</td>
                    <td className="px-5 py-3 text-gray-900">{TYPE_LABELS[tx.type] ?? tx.type}</td>
                    <td className="px-5 py-3 text-right font-medium text-gray-900">{formatAmount(tx.amount)}</td>
                    <td className="px-5 py-3 text-gray-500">{tx.note ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
