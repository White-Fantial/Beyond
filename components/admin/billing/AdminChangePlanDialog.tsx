"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import AdminDialog from "@/components/admin/AdminDialog";

interface Plan {
  id: string;
  code: string;
  name: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  tenantId: string;
  subscriptionId: string;
  currentPlanId: string;
  plans: Plan[];
}

export default function AdminChangePlanDialog({
  open,
  onClose,
  tenantId,
  subscriptionId,
  currentPlanId,
  plans,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [newPlanId, setNewPlanId] = useState(currentPlanId);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleClose() {
    setNewPlanId(currentPlanId);
    setNote("");
    setError(null);
    onClose();
  }

  async function handleConfirm() {
    if (newPlanId === currentPlanId) {
      setError("This is already the current plan.");
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch(`/api/admin/billing/tenants/${tenantId}/change-plan`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ subscriptionId, newPlanId, note: note || undefined }),
        });
        if (!res.ok) {
          const data = await res.json();
          setError(data.error ?? "Failed to change the plan.");
          return;
        }
        router.refresh();
        handleClose();
      } catch {
        setError("A network error occurred.");
      }
    });
  }

  return (
    <AdminDialog open={open} onClose={handleClose} title="Change Plan">
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Select New Plan</label>
          <select
            value={newPlanId}
            onChange={(e) => setNewPlanId(e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {plans.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.code})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Note (optional)</label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
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
            disabled={isPending || newPlanId === currentPlanId}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {isPending ? "Changing..." : "Change Plan"}
          </button>
        </div>
      </div>
    </AdminDialog>
  );
}
