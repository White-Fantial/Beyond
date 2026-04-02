"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { AdminPlanDetail, BillingInterval } from "@/types/admin-billing";

const INTERVAL_OPTIONS: { value: BillingInterval; label: string }[] = [
  { value: "MONTHLY", label: "Monthly" },
  { value: "YEARLY", label: "Yearly" },
  { value: "CUSTOM", label: "Custom" },
];

interface Props {
  plan?: AdminPlanDetail;
  onSuccess?: () => void;
}

export default function AdminPlanForm({ plan, onSuccess }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const isEdit = !!plan;

  const [form, setForm] = useState({
    code: plan?.code ?? "",
    name: plan?.name ?? "",
    description: plan?.description ?? "",
    billingInterval: plan?.billingInterval ?? ("MONTHLY" as BillingInterval),
    priceAmountMinor: plan?.priceAmountMinor ?? 0,
    currencyCode: plan?.currencyCode ?? "NZD",
    trialDays: plan?.trialDays ?? "",
    isDefault: plan?.isDefault ?? false,
    sortOrder: plan?.sortOrder ?? 0,
  });

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    const { name, value, type } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? (e.target as HTMLInputElement).checked : value,
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    startTransition(async () => {
      try {
        const payload = {
          code: form.code,
          name: form.name,
          description: form.description || undefined,
          billingInterval: form.billingInterval,
          priceAmountMinor: Number(form.priceAmountMinor),
          currencyCode: form.currencyCode,
          trialDays: form.trialDays !== "" ? Number(form.trialDays) : undefined,
          isDefault: form.isDefault,
          sortOrder: Number(form.sortOrder),
        };

        const url = isEdit
          ? `/api/admin/billing/plans/${plan!.id}`
          : "/api/admin/billing/plans";
        const method = isEdit ? "PATCH" : "POST";

        const res = await fetch(url, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const data = await res.json();
          setError(data.error ?? "Failed to save.");
          return;
        }

        setSuccess(true);
        const data = await res.json();
        router.refresh();
        if (onSuccess) {
          onSuccess();
        } else if (!isEdit && data.id) {
          router.push(`/admin/billing/plans/${data.id}`);
        }
      } catch {
        setError("A network error occurred.");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">코드 *</label>
          <input
            name="code"
            value={form.code}
            onChange={handleChange}
            disabled={isEdit}
            required
            placeholder="e.g. starter, pro, enterprise"
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-500 font-mono"
          />
          {!isEdit && (
            <p className="text-xs text-gray-400 mt-0.5">Lowercase letters, numbers, underscores, and hyphens only</p>
          )}
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Name *</label>
          <input
            name="name"
            value={form.name}
            onChange={handleChange}
            required
            placeholder="e.g. Starter Plan"
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">설명</label>
        <textarea
          name="description"
          value={form.description}
          onChange={handleChange}
          rows={2}
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Billing Cycle *</label>
          <select
            name="billingInterval"
            value={form.billingInterval}
            onChange={handleChange}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {INTERVAL_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Price (in cents) *
          </label>
          <input
            name="priceAmountMinor"
            type="number"
            min={0}
            value={form.priceAmountMinor}
            onChange={handleChange}
            required
            placeholder="e.g. 4900 = $49.00"
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Trial 일수</label>
          <input
            name="trialDays"
            type="number"
            min={0}
            value={form.trialDays}
            onChange={handleChange}
            placeholder="Leave blank for no trial"
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">정렬 순서</label>
          <input
            name="sortOrder"
            type="number"
            value={form.sortOrder}
            onChange={handleChange}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex items-center mt-5">
          <input
            name="isDefault"
            type="checkbox"
            checked={form.isDefault}
            onChange={handleChange}
            id="isDefault"
            className="mr-2"
          />
          <label htmlFor="isDefault" className="text-sm text-gray-700">
            Set as default plan
          </label>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-md px-3 py-2">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 text-sm rounded-md px-3 py-2">
          Saved.
        </div>
      )}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isPending}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {isPending ? "Saving..." : isEdit ? "Edit Plan" : "Create Plan"}
        </button>
      </div>
    </form>
  );
}
