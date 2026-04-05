"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { PromoDiscountType } from "@/types/owner-promotions";

export default function CreatePromoForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const body = {
      code: fd.get("code") as string,
      description: (fd.get("description") as string) || undefined,
      discountType: fd.get("discountType") as PromoDiscountType,
      discountValue: parseFloat(fd.get("discountValue") as string),
      maxUses: fd.get("maxUses") ? parseInt(fd.get("maxUses") as string) : undefined,
      expiresAt: (fd.get("expiresAt") as string) || undefined,
    };

    startTransition(async () => {
      setError(null);
      const res = await fetch("/api/owner/promotions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Failed to create promo code");
        return;
      }
      form.reset();
      router.refresh();
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-gray-200 bg-white p-5 space-y-4"
    >
      <h2 className="text-base font-semibold text-gray-900">Create Promo Code</h2>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Code *</label>
          <input
            name="code"
            required
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono uppercase"
            placeholder="SUMMER20"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">
            Discount type *
          </label>
          <select
            name="discountType"
            required
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
          >
            <option value="PERCENT">Percentage</option>
            <option value="FIXED_AMOUNT">Fixed amount</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">
            Discount value *
          </label>
          <input
            name="discountValue"
            type="number"
            step="0.01"
            min="0"
            required
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
            placeholder="10"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Max uses</label>
          <input
            name="maxUses"
            type="number"
            min="1"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
            placeholder="Unlimited"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Expires at</label>
          <input
            name="expiresAt"
            type="date"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Description</label>
          <input
            name="description"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
            placeholder="Optional"
          />
        </div>
      </div>
      <button
        type="submit"
        disabled={isPending}
        className="px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50 transition"
      >
        {isPending ? "Creating…" : "Create"}
      </button>
    </form>
  );
}
