"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function IssueGiftCardForm() {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [email, setEmail] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const initialValue = Math.round(parseFloat(value) * 100);
    if (!initialValue || initialValue <= 0) {
      setError("Please enter a valid dollar amount");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/owner/gift-cards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          initialValue,
          issuedToEmail: email || undefined,
          expiresAt: expiresAt || undefined,
        }),
      });
      if (!res.ok) {
        const body = await res.json();
        setError(body.error ?? "Failed to issue gift card");
        return;
      }
      setValue("");
      setEmail("");
      setExpiresAt("");
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
      <h2 className="text-sm font-semibold text-gray-900">Issue New Gift Card</h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Value ($) <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            min="1"
            step="0.01"
            required
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="50.00"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Issue to Email (optional)</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="customer@example.com"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Expires At (optional)</label>
          <input
            type="date"
            value={expiresAt}
            onChange={(e) => setExpiresAt(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
      </div>
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
      <button
        type="submit"
        disabled={submitting}
        className="px-5 py-2 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 disabled:opacity-50 transition"
      >
        {submitting ? "Issuing…" : "Issue Gift Card"}
      </button>
    </form>
  );
}
