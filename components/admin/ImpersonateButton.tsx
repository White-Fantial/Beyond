"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

interface Props {
  targetUserId: string;
  targetName: string;
  targetEmail: string;
}

export default function ImpersonateButton({ targetUserId, targetName, targetEmail }: Props) {
  const router = useRouter();
  const [showConfirm, setShowConfirm] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleClick() {
    setError(null);
    setShowConfirm(true);
  }

  function handleCancel() {
    setShowConfirm(false);
    setError(null);
  }

  async function handleConfirm() {
    setError(null);
    startTransition(async () => {
      const res = await fetch("/api/admin/impersonate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: targetUserId }),
      });

      const data = (await res.json().catch(() => ({}))) as {
        redirectUrl?: string;
        error?: string;
      };

      if (!res.ok) {
        setError(data.error ?? "Failed to start impersonation");
        setShowConfirm(false);
        return;
      }

      setShowConfirm(false);
      router.push(data.redirectUrl ?? "/app");
      router.refresh();
    });
  }

  return (
    <>
      <button
        onClick={handleClick}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-amber-700 bg-amber-50 border border-amber-300 rounded-md hover:bg-amber-100 transition-colors"
      >
        👁 View as user
      </button>

      {error && (
        <p className="mt-1 text-xs text-red-600">{error}</p>
      )}

      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full mx-4 p-6">
            <h3 className="text-base font-semibold text-gray-900 mb-1">
              View app as this user?
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              You are about to view the app as{" "}
              <span className="font-medium text-gray-900">
                {targetName} ({targetEmail})
              </span>
              .
            </p>
            <ul className="text-sm text-gray-600 space-y-1 mb-5 list-disc pl-4">
              <li>Your admin identity will remain active for audit purposes.</li>
              <li>You can exit impersonation at any time from the top banner.</li>
              <li>Sensitive write actions are limited during impersonation.</li>
            </ul>
            <div className="flex justify-end gap-3">
              <button
                onClick={handleCancel}
                disabled={isPending}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 disabled:opacity-60 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                disabled={isPending}
                className="px-4 py-2 text-sm font-medium text-white bg-amber-600 rounded-md hover:bg-amber-700 disabled:opacity-60 transition-colors"
              >
                {isPending ? "Starting…" : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
