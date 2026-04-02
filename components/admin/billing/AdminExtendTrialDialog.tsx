"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import AdminDialog from "@/components/admin/AdminDialog";

interface Props {
  open: boolean;
  onClose: () => void;
  tenantId: string;
  subscriptionId: string;
}

export default function AdminExtendTrialDialog({ open, onClose, tenantId, subscriptionId }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [days, setDays] = useState(7);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleClose() {
    setDays(7);
    setNote("");
    setError(null);
    onClose();
  }

  async function handleConfirm() {
    if (!days || days < 1) {
      setError("Extension must be at least 1 day.");
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch(`/api/admin/billing/tenants/${tenantId}/extend-trial`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ subscriptionId, extensionDays: days, note: note || undefined }),
        });
        if (!res.ok) {
          const data = await res.json();
          setError(data.error ?? "Failed to extend trial.");
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
    <AdminDialog open={open} onClose={handleClose} title="Extend Trial">
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Days to Extend</label>
          <input
            type="number"
            min={1}
            max={365}
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-xs text-gray-400 mt-0.5">Will be extended beyond the current trial end date.</p>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Note (optional)</label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            placeholder="Internal note, e.g. extension reason..."
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
            {isPending ? "Extending..." : `Extend ${days} day(s)`}
          </button>
        </div>
      </div>
    </AdminDialog>
  );
}
