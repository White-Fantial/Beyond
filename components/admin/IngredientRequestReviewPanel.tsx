"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { ReviewIngredientRequestInput } from "@/types/marketplace";
import type { Ingredient } from "@/types/owner-ingredients";

interface Props {
  requestId: string;
  requestName: string;
  requestDescription?: string | null;
  requestCategory?: string | null;
  requestUnit: string;
  requestNotes?: string | null;
}

export default function IngredientRequestReviewPanel({
  requestId,
  requestName,
  requestDescription,
  requestCategory,
  requestUnit,
  requestNotes,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [action, setAction] = useState<"APPROVED" | "DUPLICATE" | "REJECTED" | null>(null);

  // For APPROVED — review notes only (auto-creates ingredient)
  const [reviewNotes, setReviewNotes] = useState("");

  // For DUPLICATE — ingredient search
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Ingredient[]>([]);
  const [selectedIngredient, setSelectedIngredient] = useState<Ingredient | null>(null);
  const [searching, startSearch] = useTransition();

  // For REJECTED — rejection reason + optional suggested replacement
  const [rejectNotes, setRejectNotes] = useState("");
  const [rejectSearchQuery, setRejectSearchQuery] = useState("");
  const [rejectSearchResults, setRejectSearchResults] = useState<Ingredient[]>([]);
  const [suggestedIngredient, setSuggestedIngredient] = useState<Ingredient | null>(null);
  const [searchingRejection, startRejectSearch] = useTransition();

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setAction(null);
    setReviewNotes("");
    setSearchQuery("");
    setSearchResults([]);
    setSelectedIngredient(null);
    setRejectNotes("");
    setRejectSearchQuery("");
    setRejectSearchResults([]);
    setSuggestedIngredient(null);
    setError(null);
  }

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setSelectedIngredient(null);
    startSearch(async () => {
      const params = new URLSearchParams({ pageSize: "20", scope: "PLATFORM" });
      if (searchQuery.trim()) params.set("q", searchQuery.trim());
      const res = await fetch(`/api/owner/platform-ingredients?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setSearchResults((data.data?.items as Ingredient[]) ?? []);
      }
    });
  }

  async function handleRejectSearch(e: React.FormEvent) {
    e.preventDefault();
    setSuggestedIngredient(null);
    startRejectSearch(async () => {
      const params = new URLSearchParams({ pageSize: "20", scope: "PLATFORM" });
      if (rejectSearchQuery.trim()) params.set("q", rejectSearchQuery.trim());
      const res = await fetch(`/api/owner/platform-ingredients?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setRejectSearchResults((data.data?.items as Ingredient[]) ?? []);
      }
    });
  }

  async function handleSubmit() {
    if (!action) return;
    if (action === "DUPLICATE" && !selectedIngredient) {
      setError("Please select an existing ingredient.");
      return;
    }
    setSaving(true);
    setError(null);

    const body: ReviewIngredientRequestInput = {
      status: action,
      reviewNotes: (action === "REJECTED" ? rejectNotes : reviewNotes) || undefined,
      ...(action === "DUPLICATE"
        ? { resolvedIngredientId: selectedIngredient!.id }
        : {}),
      ...(action === "REJECTED" && suggestedIngredient
        ? { suggestedIngredientId: suggestedIngredient.id }
        : {}),
    };

    try {
      const res = await fetch(`/api/admin/ingredient-requests/${requestId}/review`, {
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

  function handleApproveAndEdit() {
    const params = new URLSearchParams({
      fromRequest: requestId,
      name: requestName,
      ...(requestDescription ? { description: requestDescription } : {}),
      ...(requestCategory ? { category: requestCategory } : {}),
      unit: requestUnit,
      ...(requestNotes ? { notes: requestNotes } : {}),
    });
    router.push(`/admin/ingredients/new?${params.toString()}`);
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
          <p className="text-xs font-medium text-gray-700">Choose an action:</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setAction("APPROVED")}
              className="px-3 py-1.5 text-xs font-medium bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              ✓ Approve &amp; Create
            </button>
            <button
              type="button"
              onClick={handleApproveAndEdit}
              className="px-3 py-1.5 text-xs font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              ✎ Approve &amp; Edit
            </button>
            <button
              type="button"
              onClick={() => setAction("DUPLICATE")}
              className="px-3 py-1.5 text-xs font-medium bg-amber-500 text-white rounded-lg hover:bg-amber-600"
            >
              🔗 Use Existing
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

      {/* APPROVED — auto-create from request data */}
      {action === "APPROVED" && (
        <div className="space-y-3">
          <div className="rounded-lg bg-green-50 border border-green-200 p-3 text-xs text-green-800 space-y-1">
            <p className="font-medium">A new PLATFORM ingredient will be created from the request data:</p>
            <p><span className="font-medium">Name:</span> {requestName}</p>
            {requestCategory && <p><span className="font-medium">Category:</span> {requestCategory}</p>}
            <p><span className="font-medium">Unit:</span> {requestUnit}</p>
            {requestDescription && <p><span className="font-medium">Description:</span> {requestDescription}</p>}
            {requestNotes && <p><span className="font-medium">Usage notes:</span> {requestNotes}</p>}
            <p className="text-green-600 mt-1">All recipe references to the temporary ingredient will be automatically migrated.</p>
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
              {saving ? "Creating…" : "Create & Approve"}
            </button>
          </div>
        </div>
      )}

      {/* DUPLICATE — find existing PLATFORM ingredient */}
      {action === "DUPLICATE" && (
        <div className="space-y-3">
          <p className="text-xs text-gray-600">
            Search for the existing PLATFORM ingredient that already covers this request:
          </p>
          <form onSubmit={handleSearch} className="flex gap-2">
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search ingredient by name…"
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
              {searchResults.map((ing) => (
                <button
                  key={ing.id}
                  type="button"
                  onClick={() => setSelectedIngredient(ing)}
                  className={`w-full text-left px-3 py-2 rounded-lg border text-xs transition-colors ${
                    selectedIngredient?.id === ing.id
                      ? "border-blue-500 bg-blue-50 text-blue-800"
                      : "border-gray-200 hover:bg-gray-50 text-gray-700"
                  }`}
                >
                  <span className="font-medium">{ing.name}</span>
                  {ing.category && <span className="text-gray-400 ml-2">{ing.category}</span>}
                  <span className="text-gray-400 ml-2">{ing.unit}</span>
                </button>
              ))}
            </div>
          )}
          {selectedIngredient && (
            <p className="text-xs text-green-700 font-medium">
              ✓ Selected: {selectedIngredient.name}
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
              placeholder="e.g. Already available as Olive Oil (PLATFORM)"
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
              disabled={saving || !selectedIngredient}
              className="px-3 py-1 text-xs bg-amber-500 text-white rounded hover:bg-amber-600 disabled:opacity-50"
            >
              {saving ? "Saving…" : "Link & Mark Duplicate"}
            </button>
          </div>
        </div>
      )}

      {/* REJECTED — rejection reason + optional suggested replacement */}
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
              placeholder="e.g. This ingredient is too similar to existing Olive Oil. Please use that instead."
              className="w-full border border-gray-300 rounded px-2 py-1 text-xs"
            />
          </div>

          {/* Optional: suggest a replacement ingredient */}
          <div className="border border-gray-200 rounded-lg p-3 space-y-2 bg-white">
            <p className="text-xs font-medium text-gray-700">
              Suggest a replacement ingredient{" "}
              <span className="text-gray-400 font-normal">(optional — recipe refs will be auto-migrated)</span>
            </p>
            <form onSubmit={handleRejectSearch} className="flex gap-2">
              <input
                type="search"
                value={rejectSearchQuery}
                onChange={(e) => setRejectSearchQuery(e.target.value)}
                placeholder="Search PLATFORM ingredient…"
                className="flex-1 border border-gray-300 rounded px-2 py-1 text-xs"
              />
              <button
                type="submit"
                disabled={searchingRejection}
                className="px-3 py-1 text-xs bg-gray-600 text-white rounded hover:bg-gray-700 disabled:opacity-50"
              >
                {searchingRejection ? "Searching…" : "Search"}
              </button>
            </form>
            {rejectSearchResults.length > 0 && (
              <div className="max-h-40 overflow-y-auto space-y-1">
                {rejectSearchResults.map((ing) => (
                  <button
                    key={ing.id}
                    type="button"
                    onClick={() => setSuggestedIngredient(ing)}
                    className={`w-full text-left px-3 py-2 rounded-lg border text-xs transition-colors ${
                      suggestedIngredient?.id === ing.id
                        ? "border-orange-500 bg-orange-50 text-orange-800"
                        : "border-gray-200 hover:bg-gray-50 text-gray-700"
                    }`}
                  >
                    <span className="font-medium">{ing.name}</span>
                    {ing.category && <span className="text-gray-400 ml-2">{ing.category}</span>}
                    <span className="text-gray-400 ml-2">{ing.unit}</span>
                  </button>
                ))}
              </div>
            )}
            {suggestedIngredient ? (
              <p className="text-xs text-orange-700 font-medium">
                ✓ Suggested replacement: {suggestedIngredient.name}
              </p>
            ) : (
              <p className="text-xs text-gray-400">
                No replacement selected — owner will be asked to update their recipes manually.
              </p>
            )}
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
