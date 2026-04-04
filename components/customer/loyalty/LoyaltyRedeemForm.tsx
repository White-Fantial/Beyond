"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  availablePoints: number;
  orderId?: string;
}

export default function LoyaltyRedeemForm({ availablePoints, orderId }: Props) {
  const router = useRouter();
  const [points, setPoints] = useState("");
  const [orderIdInput, setOrderIdInput] = useState(orderId ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const pts = parseInt(points, 10);
    if (isNaN(pts) || pts <= 0) {
      setError("Please enter a valid number of points.");
      return;
    }
    if (pts > availablePoints) {
      setError(`You only have ${availablePoints} points available.`);
      return;
    }
    if (!orderIdInput.trim()) {
      setError("Order ID is required.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/customer/loyalty/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: orderIdInput.trim(), points: pts }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Redemption failed.");
        return;
      }
      setSuccess(true);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-xl p-5 text-center">
        <p className="text-green-700 font-semibold">✅ Points redeemed successfully!</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
      <h3 className="text-base font-semibold text-gray-900 mb-4">Redeem Points</h3>
      <form onSubmit={handleSubmit} className="space-y-3">
        {!orderId && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Order ID</label>
            <input
              type="text"
              value={orderIdInput}
              onChange={(e) => setOrderIdInput(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              placeholder="Enter order ID"
            />
          </div>
        )}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Points to redeem
            <span className="text-gray-400 font-normal ml-1">
              (available: {availablePoints})
            </span>
          </label>
          <input
            type="number"
            value={points}
            onChange={(e) => setPoints(e.target.value)}
            min={1}
            max={availablePoints}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            placeholder="e.g. 100"
          />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={loading || availablePoints === 0}
          className="w-full py-2 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 transition disabled:opacity-50"
        >
          {loading ? "Redeeming…" : "Redeem Points"}
        </button>
      </form>
    </div>
  );
}
