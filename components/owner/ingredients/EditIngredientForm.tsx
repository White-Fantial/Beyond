"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Ingredient, UpdateIngredientInput, IngredientUnit } from "@/types/owner-ingredients";
import { INGREDIENT_UNIT_LABELS } from "@/types/owner-ingredients";

const UNITS = Object.keys(INGREDIENT_UNIT_LABELS) as IngredientUnit[];

interface Props {
  ingredient: Ingredient;
}

export default function EditIngredientForm({ ingredient }: Props) {
  const router = useRouter();
  const [name, setName] = useState(ingredient.name);
  const [recipeUnit, setRecipeUnit] = useState<IngredientUnit>(ingredient.unit);
  const [notes, setNotes] = useState(ingredient.notes ?? "");
  const [isActive, setIsActive] = useState(ingredient.isActive);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) {
      setError("Name is required.");
      return;
    }
    setSubmitting(true);
    try {
      const body: UpdateIngredientInput = {
        name: name.trim(),
        unit: recipeUnit,
        isActive,
        notes: notes || undefined,
      };
      const res = await fetch(`/api/owner/ingredients/${ingredient.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Failed to update ingredient");
        return;
      }
      router.push("/owner/ingredients");
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Are you sure you want to delete this ingredient?")) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/owner/ingredients/${ingredient.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Failed to delete ingredient");
        return;
      }
      router.push("/owner/ingredients");
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white rounded-xl border border-gray-200 p-5 space-y-4"
    >
      <p className="text-xs text-gray-500">
        Pricing is managed separately via supplier contract prices or price records,
        linked through the ingredient&apos;s supplier product association.
      </p>

      {/* Name */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">
          Name <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Bread flour"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>

      {/* Recipe unit */}
      <div className="sm:w-1/3">
        <label className="block text-xs font-medium text-gray-600 mb-1">
          Recipe Unit <span className="text-red-500">*</span>
        </label>
        <select
          required
          value={recipeUnit}
          onChange={(e) => setRecipeUnit(e.target.value as IngredientUnit)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          {UNITS.map((u) => (
            <option key={u} value={u}>
              {INGREDIENT_UNIT_LABELS[u]} ({u})
            </option>
          ))}
        </select>
      </div>

      {/* Notes */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Notes (optional)</label>
        <input
          type="text"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="e.g. Premium bread flour"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>

      {/* Active toggle */}
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="edit-ingredient-active"
          checked={isActive}
          onChange={(e) => setIsActive(e.target.checked)}
          className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
        />
        <label htmlFor="edit-ingredient-active" className="text-xs text-gray-600 select-none">
          Active
        </label>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={submitting}
          className="px-5 py-2 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 disabled:opacity-50 transition"
        >
          {submitting ? "Saving…" : "Save Changes"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/owner/ingredients")}
          className="px-5 py-2 bg-white border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleDelete}
          disabled={deleting}
          className="ml-auto px-5 py-2 bg-red-50 text-red-600 border border-red-200 text-sm font-medium rounded-lg hover:bg-red-100 disabled:opacity-50 transition"
        >
          {deleting ? "Deleting…" : "Delete"}
        </button>
      </div>
    </form>
  );
}
