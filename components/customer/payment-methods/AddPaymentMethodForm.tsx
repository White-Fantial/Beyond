"use client";

import { useState } from "react";

interface Props {
  onAdded: () => void;
  onCancel: () => void;
}

export default function AddPaymentMethodForm({ onAdded, onCancel }: Props) {
  const [providerMethodId, setProviderMethodId] = useState("");
  const [last4, setLast4] = useState("");
  const [brand, setBrand] = useState("visa");
  const [expiryMonth, setExpiryMonth] = useState("");
  const [expiryYear, setExpiryYear] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!providerMethodId || !last4 || !expiryMonth || !expiryYear) {
      setError("All fields are required.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/customer/payment-methods", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          providerMethodId,
          last4,
          brand,
          expiryMonth: parseInt(expiryMonth, 10),
          expiryYear: parseInt(expiryYear, 10),
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Failed to add card.");
        return;
      }
      void json;
      onAdded();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-xl p-5">
      <h3 className="text-sm font-semibold text-gray-800 mb-4">Add Payment Method</h3>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Stripe Payment Method ID
          </label>
          <input
            type="text"
            value={providerMethodId}
            onChange={(e) => setProviderMethodId(e.target.value)}
            placeholder="pm_..."
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Last 4 digits</label>
            <input
              type="text"
              value={last4}
              onChange={(e) => setLast4(e.target.value.replace(/\D/, "").slice(0, 4))}
              placeholder="4242"
              maxLength={4}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Brand</label>
            <select
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="visa">Visa</option>
              <option value="mastercard">Mastercard</option>
              <option value="amex">Amex</option>
              <option value="discover">Discover</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Expiry Month</label>
            <input
              type="number"
              value={expiryMonth}
              onChange={(e) => setExpiryMonth(e.target.value)}
              min={1}
              max={12}
              placeholder="MM"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Expiry Year</label>
            <input
              type="number"
              value={expiryYear}
              onChange={(e) => setExpiryYear(e.target.value)}
              min={2024}
              max={2040}
              placeholder="YYYY"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex gap-2 pt-1">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 py-2 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 transition disabled:opacity-50"
          >
            {loading ? "Saving…" : "Save Card"}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
