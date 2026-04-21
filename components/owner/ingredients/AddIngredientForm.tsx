"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { CreateIngredientInput, IngredientUnit } from "@/types/owner-ingredients";
import { INGREDIENT_UNIT_LABELS } from "@/types/owner-ingredients";

const UNITS = Object.keys(INGREDIENT_UNIT_LABELS) as IngredientUnit[];

interface Props {
  storeId: string;
}

export default function AddIngredientForm({ storeId }: Props) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [recipeUnit, setRecipeUnit] = useState<IngredientUnit>("GRAM");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) {
      setError("Name is required.");
      return;
    }
    setSubmitting(true);
    try {
      const body: CreateIngredientInput = {
        storeId,
        name: name.trim(),
        category: category.trim() || undefined,
        unit: recipeUnit,
        notes: notes || undefined,
      };
      const res = await fetch("/api/owner/ingredients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Failed to create ingredient");
        return;
      }
      router.push("/owner/ingredients");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white rounded-xl border border-gray-200 p-5 space-y-4"
    >
      <h2 className="text-sm font-semibold text-gray-900">Add Ingredient</h2>

      <p className="text-xs text-gray-500">
        Define the ingredient&apos;s recipe unit. Pricing is set separately via supplier
        contract prices or price records after linking the ingredient to a supplier product.
      </p>

      {/* Row 1: name + category */}
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
            placeholder="Bread flour"
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
            placeholder="e.g. Dairy, Produce, Meat"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
      </div>

      {/* Row 2: recipe unit */}
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
        <label className="block text-xs font-medium text-gray-600 mb-1">
          Notes (optional)
        </label>
        <input
          type="text"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="e.g. Premium bread flour, high-protein"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={submitting}
        className="px-5 py-2 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 disabled:opacity-50 transition"
      >
        {submitting ? "Saving…" : "Add Ingredient"}
      </button>
    </form>
  );
}
