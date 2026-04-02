"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { labelFeatureKey } from "@/lib/billing/labels";
import type { PlanFeatureItem } from "@/types/admin-billing";

const STANDARD_FEATURE_KEYS = [
  "advanced_analytics",
  "subscriptions_enabled",
  "multi_store",
  "delivery_integrations",
  "priority_support",
  "custom_branding",
];

interface Props {
  planId: string;
  features: PlanFeatureItem[];
  onSuccess?: () => void;
}

export default function AdminPlanFeatureEditor({ planId, features, onSuccess }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const initValues = () => {
    const map: Record<string, boolean> = {};
    STANDARD_FEATURE_KEYS.forEach((key) => {
      const existing = features.find((f) => f.key === key);
      map[key] = existing?.enabled ?? false;
    });
    return map;
  };

  const [values, setValues] = useState<Record<string, boolean>>(initValues);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    const payload = STANDARD_FEATURE_KEYS.map((key) => ({
      key,
      enabled: values[key],
    }));

    startTransition(async () => {
      try {
        const res = await fetch(`/api/admin/billing/plans/${planId}/features`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ features: payload }),
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
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {STANDARD_FEATURE_KEYS.map((key) => (
          <label key={key} className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
            <input
              type="checkbox"
              checked={values[key]}
              onChange={(e) => setValues((prev) => ({ ...prev, [key]: e.target.checked }))}
              className="w-4 h-4 text-blue-600 rounded"
            />
            <span className="text-sm text-gray-700">{labelFeatureKey(key)}</span>
          </label>
        ))}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-md px-3 py-2">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 text-sm rounded-md px-3 py-2">
          기능이 Saved.
        </div>
      )}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isPending}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {isPending ? "Saving..." : "Save Features"}
        </button>
      </div>
    </form>
  );
}
