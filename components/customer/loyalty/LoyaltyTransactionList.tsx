"use client";

import { useState } from "react";
import type { LoyaltyTransaction, LoyaltyTransactionListResult } from "@/types/customer-loyalty";

const TYPE_BADGE: Record<string, string> = {
  EARN: "bg-green-100 text-green-700",
  REDEEM: "bg-red-100 text-red-700",
  ADJUSTMENT: "bg-blue-100 text-blue-700",
};

interface Props {
  initialResult: LoyaltyTransactionListResult;
}

export default function LoyaltyTransactionList({ initialResult }: Props) {
  const [result, setResult] = useState(initialResult);
  const [loading, setLoading] = useState(false);

  async function loadPage(page: number) {
    setLoading(true);
    try {
      const res = await fetch(`/api/customer/loyalty/transactions?page=${page}&pageSize=${result.pageSize}`);
      if (res.ok) {
        const json = await res.json();
        setResult(json.data);
      }
    } finally {
      setLoading(false);
    }
  }

  const totalPages = Math.ceil(result.total / result.pageSize);

  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Transaction History</h2>

      {result.items.length === 0 ? (
        <div className="py-10 text-center text-gray-400">
          <p className="text-3xl mb-2">🏅</p>
          <p>No transactions yet.</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-100 border border-gray-200 rounded-xl overflow-hidden">
          {result.items.map((tx) => (
            <TransactionRow key={tx.id} tx={tx} />
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 text-sm text-gray-600">
          <button
            onClick={() => loadPage(result.page - 1)}
            disabled={result.page <= 1 || loading}
            className="px-3 py-1.5 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50"
          >
            Previous
          </button>
          <span>
            Page {result.page} of {totalPages}
          </span>
          <button
            onClick={() => loadPage(result.page + 1)}
            disabled={result.page >= totalPages || loading}
            className="px-3 py-1.5 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}

function TransactionRow({ tx }: { tx: LoyaltyTransaction }) {
  const isPositive = tx.pointsDelta > 0;
  return (
    <div className="flex items-center justify-between px-4 py-3 bg-white hover:bg-gray-50">
      <div className="flex items-center gap-3">
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
            TYPE_BADGE[tx.type] ?? "bg-gray-100 text-gray-600"
          }`}
        >
          {tx.type}
        </span>
        <div>
          <p className="text-sm text-gray-800">{tx.description ?? tx.type}</p>
          <p className="text-xs text-gray-400">
            {new Date(tx.createdAt).toLocaleDateString()}
          </p>
        </div>
      </div>
      <span
        className={`text-sm font-semibold ${isPositive ? "text-green-600" : "text-red-600"}`}
      >
        {isPositive ? "+" : ""}
        {tx.pointsDelta} pts
      </span>
    </div>
  );
}
