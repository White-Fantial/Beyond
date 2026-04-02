"use client";

import { useState, useTransition } from "react";
import Link from "next/link";

interface Props {
  connectionId: string;
  canRefreshCredentials: boolean;
}

export default function TriggerRefreshCheckButton({
  connectionId,
  canRefreshCredentials,
}: Props) {
  const [confirm, setConfirm] = useState(false);
  const [result, setResult] = useState<{ jobRunId?: string; message?: string; error?: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  if (!canRefreshCredentials) return null;

  function handleTrigger() {
    startTransition(async () => {
      try {
        const res = await fetch(
          `/api/admin/integrations/${connectionId}/trigger-refresh-check`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ reason: "Admin manual refresh check" }),
          }
        );
        const data = await res.json();
        if (!res.ok) {
          setResult({ error: data.error ?? "Refresh request failed" });
        } else {
          setResult(data);
        }
        setConfirm(false);
      } catch {
        setResult({ error: "A network error occurred." });
        setConfirm(false);
      }
    });
  }

  return (
    <div>
      {!confirm ? (
        <button
          onClick={() => setConfirm(true)}
          className="inline-flex items-center px-3 py-2 border border-teal-300 rounded text-sm font-medium text-teal-700 bg-teal-50 hover:bg-teal-100 transition-colors"
        >
          🔑 Trigger Token Refresh
        </button>
      ) : (
        <div className="border border-teal-200 rounded-lg p-4 bg-teal-50">
          <p className="text-sm font-semibold text-teal-800 mb-1">Run Token Refresh Check</p>
          <p className="text-xs text-teal-700 mb-3">
            Attempts to refresh expiring or expired credentials. The same safety checks as the regular refresh logic apply.
            Do you want to continue?
          </p>
          <div className="flex gap-2">
            <button
              onClick={handleTrigger}
              disabled={isPending}
              className="px-3 py-1.5 bg-teal-600 text-white text-sm rounded hover:bg-teal-700 disabled:opacity-50"
            >
              {isPending ? "Requesting..." : "Runs"}
            </button>
            <button
              onClick={() => setConfirm(false)}
              className="px-3 py-1.5 border border-gray-300 text-gray-600 text-sm rounded hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
      {result && (
        <div
          className={`mt-2 rounded p-3 text-xs ${
            result.error
              ? "bg-red-50 border border-red-200 text-red-700"
              : "bg-green-50 border border-green-200 text-green-700"
          }`}
        >
          {result.error ? (
            <p>{result.error}</p>
          ) : (
            <>
              <p className="font-semibold mb-1">✓ Token refresh check job queued</p>
              <p>{result.message}</p>
              {result.jobRunId && (
                <Link
                  href={`/admin/jobs/${result.jobRunId}`}
                  className="mt-1 block underline font-medium"
                >
                  View job details →
                </Link>
              )}
            </>
          )}
          <button
            onClick={() => setResult(null)}
            className="mt-2 text-xs underline opacity-70 hover:opacity-100"
          >
            닫기
          </button>
        </div>
      )}
    </div>
  );
}
