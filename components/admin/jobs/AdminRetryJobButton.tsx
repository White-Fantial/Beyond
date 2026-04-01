"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import AdminDialog from "@/components/admin/AdminDialog";

interface AdminRetryJobButtonProps {
  jobRunId: string;
}

export default function AdminRetryJobButton({ jobRunId }: AdminRetryJobButtonProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleRetry() {
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch(`/api/admin/jobs/${jobRunId}/retry`, {
          method: "POST",
        });
        const data = (await res.json()) as { id?: string; error?: string };
        if (!res.ok) {
          setError(data.error ?? "Retry failed.");
          return;
        }
        setOpen(false);
        router.push(`/admin/jobs/${data.id}`);
        router.refresh();
      } catch {
        setError("A network error occurred. Please try again.");
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs text-orange-600 hover:text-orange-700 hover:underline font-medium"
      >
        Retry
      </button>

      <AdminDialog open={open} onClose={() => setOpen(false)} title="Confirm job retry">
        <div className="space-y-4">
          <p className="text-sm text-gray-700">
            This job will be retried. The existing failed run will not be changed; a new run will be created.
          </p>
          <p className="text-sm text-gray-700">
            Existing idempotency rules and safety guards will still apply.
          </p>
          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
              {error}
            </p>
          )}
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="px-4 py-2 text-sm rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleRetry}
              disabled={isPending}
              className="px-4 py-2 text-sm rounded-md bg-orange-600 text-white hover:bg-orange-700 disabled:opacity-50"
            >
              {isPending ? "Retrying..." : "Retry"}
            </button>
          </div>
        </div>
      </AdminDialog>
    </>
  );
}
