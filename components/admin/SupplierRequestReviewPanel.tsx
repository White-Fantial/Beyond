"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ReviewSupplierRequestInput } from "@/types/owner-suppliers";

interface Props {
  requestId: string;
}

export default function SupplierRequestReviewPanel({ requestId }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<"APPROVED" | "REJECTED" | "DUPLICATE">("REJECTED");
  const [resolvedId, setResolvedId] = useState("");
  const [reviewNotes, setReviewNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const body: ReviewSupplierRequestInput = {
      status,
      reviewNotes: reviewNotes || undefined,
      ...(status === "APPROVED" || status === "DUPLICATE"
        ? { resolvedSupplierId: resolvedId || undefined }
        : {}),
    };

    try {
      const res = await fetch(`/api/admin/supplier-requests/${requestId}/review`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to save review.");
      }

      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred.");
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="px-3 py-1 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700"
      >
        Review
      </button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="border border-blue-200 rounded-lg p-3 bg-blue-50 space-y-2 w-72"
    >
      {error && <p className="text-xs text-red-600">{error}</p>}

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">
          Decision *
        </label>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as typeof status)}
          className="w-full border border-gray-300 rounded px-2 py-1 text-xs"
        >
          <option value="APPROVED">Approve (create platform supplier)</option>
          <option value="DUPLICATE">Duplicate (link existing supplier)</option>
          <option value="REJECTED">Reject</option>
        </select>
      </div>

      {(status === "APPROVED" || status === "DUPLICATE") && (
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Platform Supplier ID *
          </label>
          <input
            type="text"
            value={resolvedId}
            onChange={(e) => setResolvedId(e.target.value)}
            placeholder="Supplier UUID (scope=PLATFORM)"
            required
            className="w-full border border-gray-300 rounded px-2 py-1 text-xs font-mono"
          />
          <p className="text-xs text-gray-400 mt-0.5">
            Create the supplier at /admin/suppliers first, then paste its ID here.
          </p>
        </div>
      )}

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">
          Review notes
        </label>
        <textarea
          value={reviewNotes}
          onChange={(e) => setReviewNotes(e.target.value)}
          rows={2}
          placeholder="Optional review notes"
          className="w-full border border-gray-300 rounded px-2 py-1 text-xs"
        />
      </div>

      <div className="flex gap-2 justify-end">
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setError(null);
          }}
          className="px-3 py-1 text-xs text-gray-600 border border-gray-300 rounded hover:bg-gray-100"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Confirm"}
        </button>
      </div>
    </form>
  );
}
