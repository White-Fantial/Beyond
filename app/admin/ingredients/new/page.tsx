"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { IngredientUnit } from "@/types/owner-ingredients";
import { INGREDIENT_UNIT_LABELS } from "@/types/owner-ingredients";

const UNITS = Object.keys(INGREDIENT_UNIT_LABELS) as IngredientUnit[];

export default function AdminNewIngredientPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Pre-fill from query params when arriving from "Approve & Edit"
  const fromRequest = searchParams.get("fromRequest");
  const [name, setName] = useState(searchParams.get("name") ?? "");
  const [description, setDescription] = useState(searchParams.get("description") ?? "");
  const [category, setCategory] = useState(searchParams.get("category") ?? "");
  const [unit, setUnit] = useState<IngredientUnit>(
    (searchParams.get("unit") as IngredientUnit) ?? "GRAM"
  );
  const [notes, setNotes] = useState(searchParams.get("notes") ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Sync state if query params change (e.g. client-side navigation)
    setName(searchParams.get("name") ?? "");
    setDescription(searchParams.get("description") ?? "");
    setCategory(searchParams.get("category") ?? "");
    setUnit((searchParams.get("unit") as IngredientUnit) ?? "GRAM");
    setNotes(searchParams.get("notes") ?? "");
  }, [searchParams]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError("Name is required.");
      return;
    }
    setError(null);
    setSubmitting(true);

    try {
      // Step 1: Create the PLATFORM ingredient via admin ingredients API
      const createRes = await fetch("/api/admin/platform-ingredients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || undefined,
          category: category.trim() || undefined,
          unit,
          notes: notes.trim() || undefined,
        }),
      });

      if (!createRes.ok) {
        const data = await createRes.json();
        setError(data.error ?? "Failed to create ingredient.");
        return;
      }

      const createData = await createRes.json();
      const ingredientId = createData.data?.id as string;

      // Step 2: If we arrived from a request, approve it with the new ingredient ID
      if (fromRequest && ingredientId) {
        const reviewRes = await fetch(
          `/api/admin/ingredient-requests/${fromRequest}/review`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              status: "APPROVED",
              resolvedIngredientId: ingredientId,
            }),
          }
        );

        if (!reviewRes.ok) {
          // Ingredient was created but review failed — still navigate away
          // to avoid confusion, but show warning
          const data = await reviewRes.json();
          setError(
            `Ingredient created (ID: ${ingredientId}), but review failed: ${data.error ?? "unknown error"}. Please review the request manually.`
          );
          return;
        }

        router.push("/admin/ingredient-requests");
      } else {
        router.push("/admin/ingredients");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="text-sm text-gray-500 hover:text-gray-700 transition"
        >
          ← Back
        </button>
        <span className="text-gray-300">/</span>
        <h1 className="text-xl font-bold text-gray-900">
          {fromRequest ? "Review & Create Ingredient" : "New Platform Ingredient"}
        </h1>
      </div>

      {fromRequest && (
        <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 text-xs text-blue-800">
          <p className="font-medium">Creating ingredient from a request (ID: {fromRequest})</p>
          <p className="mt-0.5">
            Saving will create the PLATFORM ingredient and approve the request, migrating any recipe
            references from the temporary ingredient automatically.
          </p>
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-xl border border-gray-200 p-5 space-y-4"
      >
        <h2 className="text-sm font-semibold text-gray-900">Ingredient Details</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Truffle Oil"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Category (optional)
            </label>
            <input
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="e.g. Oils, Dairy, Produce"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Description (optional)
          </label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Brief description"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        <div className="sm:w-1/3">
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Recipe Unit <span className="text-red-500">*</span>
          </label>
          <select
            required
            value={unit}
            onChange={(e) => setUnit(e.target.value as IngredientUnit)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            {UNITS.map((u) => (
              <option key={u} value={u}>
                {INGREDIENT_UNIT_LABELS[u]} ({u})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Notes (optional)
          </label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Any additional notes"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={submitting}
            className="px-5 py-2 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 disabled:opacity-50 transition"
          >
            {submitting
              ? "Saving…"
              : fromRequest
              ? "Create & Approve Request"
              : "Create Ingredient"}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="px-5 py-2 bg-white border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
