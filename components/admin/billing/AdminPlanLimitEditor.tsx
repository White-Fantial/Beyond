"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { labelLimitKey } from "@/lib/billing/labels";
import type { PlanLimitItem } from "@/types/admin-billing";

const STANDARD_LIMIT_KEYS = [
  { key: "max_stores", unit: " more" },
  { key: "max_users", unit: "" },
  { key: "max_active_integrations", unit: " more" },
  { key: "monthly_order_limit", unit: "" },
];

interface Props {
  planId: string;
  limits: PlanLimitItem[];
  onSuccess?: () => void;
}

export default function AdminPlanLimitEditor({ planId, limits, onSuccess }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const initValues = () => {
    const map: Record<string, string> = {};
    STANDARD_LIMIT_KEYS.forEach(({ key }) => {
      const existing = limits.find((l) => l.key === key);
      map[key] = existing?.valueInt != null ? String(existing.valueInt) : "";
    });
    return map;
  };

  const [values, setValues] = useState<Record<string, string>>(initValues);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    const payload = STANDARD_LIMIT_KEYS.filter(({ key }) => values[key] !== "").map(({ key, unit }) => ({
      key,
      valueInt: values[key] !== "" ? Number(values[key]) : null,
      unit,
    }));

    startTransition(async () => {
      try {
        const res = await fetch(`/api/admin/billing/plans/${planId}/limits`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ limits: payload }),
        });
        if (!res.ok) {
          const data = await res.json();
          setError(data.error ?? "Failed to save.");
          return;
        }
        setSuccess(true);
        router.refresh();
        onSuccess?.();
      } catch {
        setError("A network error occurred.");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {STANDARD_LIMIT_KEYS.map(({ key, unit }) => (
          <div key={key}>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              {labelLimitKey(key)}
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                value={values[key]}
                onChange={(e) => setValues((prev) => ({ ...prev, [key]: e.target.value }))}
                placeholder="Unlimited (leave blank)"
                className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-xs text-gray-500 shrink-0">{unit}</span>
            </div>
          </div>
        ))}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-md px-3 py-2">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 text-sm rounded-md px-3 py-2">
          Limits saved.
        </div>
      )}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isPending}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {isPending ? "Saving..." : "Save Limits"}
        </button>
      </div>
    </form>
  );
}
