"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { ReviewSupplierRequestInput, Supplier } from "@/types/owner-suppliers";

interface Props {
  requestId: string;
  requestName: string;
  requestWebsite?: string | null;
  requestEmail?: string | null;
  requestPhone?: string | null;
  requestNotes?: string | null;
}

export default function SupplierRequestReviewPanel({
  requestId,
  requestName,
  requestWebsite,
  requestEmail,
  requestPhone,
  requestNotes,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [action, setAction] = useState<"APPROVED" | "DUPLICATE" | "REJECTED" | null>(null);

  // For APPROVED
  const [reviewNotes, setReviewNotes] = useState("");
  // For DUPLICATE — supplier search
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Supplier[]>([]);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [searching, startSearch] = useTransition();
  // For REJECTED
  const [rejectNotes, setRejectNotes] = useState("");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setAction(null);
    setReviewNotes("");
    setSearchQuery("");
    setSearchResults([]);
    setSelectedSupplier(null);
    setRejectNotes("");
    setError(null);
  }

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setSelectedSupplier(null);
    startSearch(async () => {
      const params = new URLSearchParams({ pageSize: "20" });
      if (searchQuery.trim()) params.set("q", searchQuery.trim());
      const res = await fetch(`/api/admin/suppliers?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setSearchResults((data.data?.items as Supplier[]) ?? []);
      }
    });
  }

  async function handleSubmit() {
    if (!action) return;
    if (action === "DUPLICATE" && !selectedSupplier) {
      setError("Please select an existing supplier.");
      return;
    }
    setSaving(true);
    setError(null);

    const body: ReviewSupplierRequestInput = {
      status: action,
      reviewNotes: (action === "REJECTED" ? rejectNotes : reviewNotes) || undefined,
      ...(action === "DUPLICATE" ? { resolvedSupplierId: selectedSupplier!.id } : {}),
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
      reset();
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
    <div className="mt-3 border border-blue-200 rounded-lg p-4 bg-blue-50 space-y-3 w-full">
      {error && <p className="text-xs text-red-600">{error}</p>}

      {/* Action selection */}
      {!action && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-gray-700">Choose an action for this request:</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setAction("APPROVED")}
              className="px-3 py-1.5 text-xs font-medium bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              ✓ Approve &amp; Create Supplier
            </button>
            <button
              type="button"
              onClick={() => setAction("DUPLICATE")}
              className="px-3 py-1.5 text-xs font-medium bg-amber-500 text-white rounded-lg hover:bg-amber-600"
            >
              🔗 Use Existing Supplier
            </button>
            <button
              type="button"
              onClick={() => setAction("REJECTED")}
              className="px-3 py-1.5 text-xs font-medium bg-red-500 text-white rounded-lg hover:bg-red-600"
            >
              ✗ Reject
            </button>
            <button
              type="button"
              onClick={() => { setOpen(false); reset(); }}
              className="px-3 py-1.5 text-xs text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-100"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* APPROVED flow */}
      {action === "APPROVED" && (
        <div className="space-y-3">
          <div className="rounded-lg bg-green-50 border border-green-200 p-3 text-xs text-green-800 space-y-1">
            <p className="font-medium">A new PLATFORM supplier will be created from the request data:</p>
            <p><span className="font-medium">Name:</span> {requestName}</p>
            {requestWebsite && <p><span className="font-medium">Website:</span> {requestWebsite}</p>}
            {requestEmail && <p><span className="font-medium">Email:</span> {requestEmail}</p>}
            {requestPhone && <p><span className="font-medium">Phone:</span> {requestPhone}</p>}
            {requestNotes && <p><span className="font-medium">Notes:</span> {requestNotes}</p>}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Review notes (optional)
            </label>
            <textarea
              value={reviewNotes}
              onChange={(e) => setReviewNotes(e.target.value)}
              rows={2}
              placeholder="Any additional notes for this approval"
              className="w-full border border-gray-300 rounded px-2 py-1 text-xs"
            />
          </div>
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={() => { setAction(null); setError(null); }}
              className="px-3 py-1 text-xs text-gray-600 border border-gray-300 rounded hover:bg-gray-100"
            >
              Back
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={saving}
              className="px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
            >
              {saving ? "Creating…" : "Create Supplier & Approve"}
            </button>
          </div>
        </div>
      )}

      {/* DUPLICATE flow — search existing supplier */}
      {action === "DUPLICATE" && (
        <div className="space-y-3">
          <p className="text-xs text-gray-600">
            Search for the existing PLATFORM supplier that already covers this request:
          </p>
          <form onSubmit={handleSearch} className="flex gap-2">
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search supplier by name…"
              className="flex-1 border border-gray-300 rounded px-2 py-1 text-xs"
            />
            <button
              type="submit"
              disabled={searching}
              className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {searching ? "Searching…" : "Search"}
            </button>
          </form>
          {searchResults.length > 0 && (
            <div className="max-h-40 overflow-y-auto space-y-1">
              {searchResults.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSelectedSupplier(s)}
                  className={`w-full text-left px-3 py-2 rounded-lg border text-xs transition-colors ${
                    selectedSupplier?.id === s.id
                      ? "border-blue-500 bg-blue-50 text-blue-800"
                      : "border-gray-200 hover:bg-gray-50 text-gray-700"
                  }`}
                >
                  <span className="font-medium">{s.name}</span>
                  {s.websiteUrl && <span className="text-gray-400 ml-2">{s.websiteUrl}</span>}
                </button>
              ))}
            </div>
          )}
          {selectedSupplier && (
            <p className="text-xs text-green-700 font-medium">
              ✓ Selected: {selectedSupplier.name}
            </p>
          )}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Review notes (optional)
            </label>
            <textarea
              value={reviewNotes}
              onChange={(e) => setReviewNotes(e.target.value)}
              rows={2}
              placeholder="e.g. Already covered by Sysco"
              className="w-full border border-gray-300 rounded px-2 py-1 text-xs"
            />
          </div>
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={() => { setAction(null); setError(null); }}
              className="px-3 py-1 text-xs text-gray-600 border border-gray-300 rounded hover:bg-gray-100"
            >
              Back
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={saving || !selectedSupplier}
              className="px-3 py-1 text-xs bg-amber-500 text-white rounded hover:bg-amber-600 disabled:opacity-50"
            >
              {saving ? "Saving…" : "Link & Mark Duplicate"}
            </button>
          </div>
        </div>
      )}

      {/* REJECTED flow */}
      {action === "REJECTED" && (
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Rejection reason <span className="text-gray-400">(shown to the owner)</span>
            </label>
            <textarea
              value={rejectNotes}
              onChange={(e) => setRejectNotes(e.target.value)}
              rows={3}
              placeholder="e.g. Supplier does not meet platform requirements"
              className="w-full border border-gray-300 rounded px-2 py-1 text-xs"
            />
          </div>
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={() => { setAction(null); setError(null); }}
              className="px-3 py-1 text-xs text-gray-600 border border-gray-300 rounded hover:bg-gray-100"
            >
              Back
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={saving}
              className="px-3 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50"
            >
              {saving ? "Saving…" : "Reject Request"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

