"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import AdminDialog from "@/components/admin/AdminDialog";
import { labelSubscriptionStatus } from "@/lib/billing/labels";
import type { SubscriptionStatus } from "@/types/admin-billing";

const ALLOWED_TRANSITIONS: Record<string, SubscriptionStatus[]> = {
  TRIAL: ["ACTIVE", "CANCELLED", "EXPIRED"],
  ACTIVE: ["PAST_DUE", "SUSPENDED", "CANCELLED"],
  PAST_DUE: ["ACTIVE", "SUSPENDED", "CANCELLED"],
  SUSPENDED: ["ACTIVE", "CANCELLED"],
  CANCELLED: [],
  EXPIRED: ["ACTIVE"],
  INCOMPLETE: ["ACTIVE", "CANCELLED"],
};

interface Props {
  open: boolean;
  onClose: () => void;
  tenantId: string;
  subscriptionId: string;
  currentStatus: SubscriptionStatus;
}

export default function AdminChangeSubscriptionStatusDialog({
  open,
  onClose,
  tenantId,
  subscriptionId,
  currentStatus,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const allowedStatuses = ALLOWED_TRANSITIONS[currentStatus] ?? [];
  const [newStatus, setNewStatus] = useState<SubscriptionStatus>(allowedStatuses[0] ?? currentStatus);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleClose() {
    setNote("");
    setError(null);
    onClose();
  }

  async function handleConfirm() {
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch(`/api/admin/billing/tenants/${tenantId}/subscription-status`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ subscriptionId, newStatus, note: note || undefined }),
        });
        if (!res.ok) {
          const data = await res.json();
          setError(data.error ?? "Failed to change status.");
          return;
        }
        router.refresh();
        handleClose();
      } catch {
        setError("A network error occurred.");
      }
    });
  }

  if (allowedStatuses.length === 0) {
    return (
      <AdminDialog open={open} onClose={handleClose} title="Change Subscription Status">
        <p className="text-sm text-gray-600">
          Current status <strong>{labelSubscriptionStatus(currentStatus)}</strong>cannot be changed further.
          
        </p>
        <div className="flex justify-end mt-4">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            닫기
          </button>
        </div>
      </AdminDialog>
    );
  }

  return (
    <AdminDialog open={open} onClose={handleClose} title="Change Subscription Status">
      <div className="space-y-4">
        <p className="text-sm text-gray-600">
          Current status: <strong>{labelSubscriptionStatus(currentStatus)}</strong>
        </p>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">변경할 Status</label>
          <select
            value={newStatus}
            onChange={(e) => setNewStatus(e.target.value as SubscriptionStatus)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {allowedStatuses.map((s) => (
              <option key={s} value={s}>
                {labelSubscriptionStatus(s)}
              </option>
            ))}
          </select>
        </div>

        {(newStatus === "SUSPENDED" || newStatus === "CANCELLED") && (
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 text-xs rounded-md px-3 py-2">
            Warning: This action may affect tenant service access.
          </div>
        )}

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Note (optional)</label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            placeholder="Internal note, e.g. reason for change..."
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-md px-3 py-2">
            {error}
          </div>
        )}

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isPending}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {isPending ? "Changing..." : "Change Status"}
          </button>
        </div>
      </div>
    </AdminDialog>
  );
}
