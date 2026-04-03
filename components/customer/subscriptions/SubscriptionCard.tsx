"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { CustomerSubscriptionSummary } from "@/types/customer";

const STATUS_BADGE: Record<string, string> = {
  ACTIVE: "bg-green-100 text-green-700",
  PAUSED: "bg-yellow-100 text-yellow-700",
  CANCELLED: "bg-red-100 text-red-700",
};

const INTERVAL_LABELS: Record<string, string> = {
  WEEKLY: "Weekly",
  BIWEEKLY: "Bi-weekly",
  MONTHLY: "Monthly",
  ANNUALLY: "Annually",
};

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-NZ", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function fmtAmount(minor: number) {
  return new Intl.NumberFormat("en-NZ", { style: "currency", currency: "NZD" }).format(
    minor / 100
  );
}

interface SubscriptionCardProps {
  subscription: CustomerSubscriptionSummary;
  onAction: () => void;
}

export function SubscriptionCard({ subscription: sub, onAction }: SubscriptionCardProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const statusClass = STATUS_BADGE[sub.status] ?? "bg-gray-100 text-gray-600";

  async function callAction(path: string, method = "PATCH", body?: object) {
    setError(null);
    const res = await fetch(`/api/customer/subscriptions/${sub.id}/${path}`, {
      method,
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError((data as { error?: string }).error ?? "Something went wrong.");
      return false;
    }
    return true;
  }

  function handlePause() {
    startTransition(async () => {
      const ok = await callAction("pause");
      if (ok) { onAction(); router.refresh(); }
    });
  }

  function handleResume() {
    startTransition(async () => {
      const ok = await callAction("resume");
      if (ok) { onAction(); router.refresh(); }
    });
  }

  function handleCancel() {
    if (!confirm("Are you sure you want to cancel this subscription?")) return;
    startTransition(async () => {
      const ok = await callAction("cancel");
      if (ok) { onAction(); router.refresh(); }
    });
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="font-semibold text-gray-900">{sub.planName}</div>
          <div className="text-sm text-gray-500">{sub.storeName ?? "Unknown Store"}</div>
        </div>
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${statusClass}`}>
          {sub.status}
        </span>
      </div>

      {/* Plan details */}
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <div className="text-xs text-gray-400">Price</div>
          <div className="text-gray-900">
            {fmtAmount(sub.planPrice)} / {INTERVAL_LABELS[sub.planInterval] ?? sub.planInterval}
          </div>
        </div>
        <div>
          <div className="text-xs text-gray-400">Started</div>
          <div className="text-gray-900">{fmtDate(sub.startDate)}</div>
        </div>
        <div>
          <div className="text-xs text-gray-400">Next Order</div>
          <div className="text-gray-900">{fmtDate(sub.nextOrderAt)}</div>
        </div>
        <div>
          <div className="text-xs text-gray-400">Next Billing</div>
          <div className="text-gray-900">{fmtDate(sub.nextBillingDate)}</div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <p className="text-xs text-red-600 bg-red-50 rounded px-2 py-1">{error}</p>
      )}

      {/* Actions */}
      {sub.status !== "CANCELLED" && (
        <div className="flex flex-wrap gap-2 pt-1">
          {sub.status === "ACTIVE" && (
            <button
              onClick={handlePause}
              disabled={isPending}
              className="text-xs px-3 py-1.5 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition"
            >
              Pause
            </button>
          )}
          {sub.status === "PAUSED" && (
            <button
              onClick={handleResume}
              disabled={isPending}
              className="text-xs px-3 py-1.5 rounded-lg border border-green-300 text-green-700 hover:bg-green-50 disabled:opacity-50 transition"
            >
              Resume
            </button>
          )}
          <button
            onClick={() => setShowDatePicker((v) => !v)}
            disabled={isPending}
            className="text-xs px-3 py-1.5 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition"
          >
            Change Date
          </button>
          <button
            onClick={handleCancel}
            disabled={isPending}
            className="text-xs px-3 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50 transition"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Date picker */}
      {showDatePicker && (
        <NextDatePicker
          subscriptionId={sub.id}
          onSaved={() => { setShowDatePicker(false); onAction(); router.refresh(); }}
          onCancel={() => setShowDatePicker(false)}
        />
      )}
    </div>
  );
}

function NextDatePicker({
  subscriptionId,
  onSaved,
  onCancel,
}: {
  subscriptionId: string;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [date, setDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    if (!date) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/customer/subscriptions/${subscriptionId}/next-date`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ nextOrderAt: new Date(date).toISOString() }),
        }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError((data as { error?: string }).error ?? "Failed to save.");
        return;
      }
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  const minDate = new Date();
  minDate.setDate(minDate.getDate() + 1);
  const minStr = minDate.toISOString().split("T")[0];

  return (
    <div className="border border-gray-200 rounded-lg p-3 space-y-2 bg-gray-50">
      <p className="text-xs font-medium text-gray-700">Select next order date</p>
      <input
        type="date"
        value={date}
        min={minStr}
        onChange={(e) => setDate(e.target.value)}
        className="block w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-brand-500"
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button
          onClick={handleSave}
          disabled={saving || !date}
          className="text-xs px-3 py-1.5 rounded-lg bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-50 transition"
        >
          {saving ? "Saving…" : "Save"}
        </button>
        <button
          onClick={onCancel}
          disabled={saving}
          className="text-xs px-3 py-1.5 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 transition"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
