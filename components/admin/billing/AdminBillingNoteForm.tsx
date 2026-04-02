"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { BillingRecordType } from "@/types/admin-billing";

interface Props {
  tenantId: string;
  subscriptionId?: string;
  onSuccess?: () => void;
}

export default function AdminBillingNoteForm({ tenantId, subscriptionId, onSuccess }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [recordType, setRecordType] = useState<BillingRecordType>("NOTE");
  const [summary, setSummary] = useState("");
  const [amountMinor, setAmountMinor] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!summary.trim()) {
      setError("Please enter a note.");
      return;
    }
    setError(null);
    setSuccess(false);

    startTransition(async () => {
      try {
        const payload: Record<string, unknown> = {
          recordType,
          summary: summary.trim(),
          status: "OPEN",
        };
        if (subscriptionId) payload.tenantSubscriptionId = subscriptionId;
        if (amountMinor && (recordType === "ADJUSTMENT" || recordType === "CREDIT")) {
          payload.amountMinor = Number(amountMinor);
          payload.currencyCode = "NZD";
        }

        const res = await fetch(`/api/admin/billing/tenants/${tenantId}/billing-record`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const data = await res.json();
          setError(data.error ?? "Failed to save.");
          return;
        }
        setSummary("");
        setAmountMinor("");
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
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Type</label>
          <select
            value={recordType}
            onChange={(e) => setRecordType(e.target.value as BillingRecordType)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="NOTE">Note</option>
            <option value="ADJUSTMENT">조정</option>
            <option value="CREDIT">크레딧</option>
          </select>
        </div>

        {(recordType === "ADJUSTMENT" || recordType === "CREDIT") && (
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Amount (cents)</label>
            <input
              type="number"
              min={0}
              value={amountMinor}
              onChange={(e) => setAmountMinor(e.target.value)}
              placeholder="e.g. 4900 = $49.00"
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        )}
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">내용 *</label>
        <textarea
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          rows={2}
          placeholder="Note or adjustment details..."
          required
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-md px-3 py-2">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 text-sm rounded-md px-3 py-2">
          Record added.
        </div>
      )}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isPending}
          className="px-4 py-2 bg-gray-800 text-white text-sm font-medium rounded-lg hover:bg-gray-900 disabled:opacity-50"
        >
          {isPending ? "Saving..." : "Add Record"}
        </button>
      </div>
    </form>
  );
}
