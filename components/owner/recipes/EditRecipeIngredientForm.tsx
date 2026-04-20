"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { RecipeIngredient, RecipeIngredientInput } from "@/types/owner-recipes";
import type { IngredientUnit } from "@/types/owner-ingredients";
import { INGREDIENT_UNIT_LABELS } from "@/types/owner-ingredients";

const UNITS = Object.keys(INGREDIENT_UNIT_LABELS) as IngredientUnit[];

interface Props {
  recipeId: string;
  ingredient: RecipeIngredient;
  currentIngredients: RecipeIngredient[];
  onClose: () => void;
}

export default function EditRecipeIngredientForm({
  recipeId,
  ingredient,
  currentIngredients,
  onClose,
}: Props) {
  const router = useRouter();
  const [quantity, setQuantity] = useState(String(ingredient.quantity));
  const [unit, setUnit] = useState<IngredientUnit>(ingredient.unit);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const qty = parseFloat(quantity);
    if (!qty || qty <= 0) {
      setError("Quantity must be greater than 0.");
      return;
    }

    const updatedIngredients: RecipeIngredientInput[] = currentIngredients.map((i) =>
      i.id === ingredient.id
        ? { ingredientId: i.ingredientId, quantity: qty, unit }
        : { ingredientId: i.ingredientId, quantity: i.quantity, unit: i.unit }
    );

    setSubmitting(true);
    try {
      const res = await fetch(`/api/owner/recipes/${recipeId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ingredients: updatedIngredients }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Failed to update ingredient.");
        return;
      }
      router.refresh();
      onClose();
    } catch {
      setError("A network error occurred.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="border-t border-gray-100 bg-gray-50 px-5 py-4">
      <h4 className="text-xs font-semibold text-gray-700 mb-3">
        Edit — {ingredient.ingredientName}
      </h4>
      <form onSubmit={handleSubmit} className="flex flex-wrap gap-3 items-end">
        <div className="w-28">
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Quantity <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            min="0.001"
            step="any"
            required
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
        <div className="w-32">
          <label className="block text-xs font-medium text-gray-600 mb-1">Unit</label>
          <select
            value={unit}
            onChange={(e) => setUnit(e.target.value as IngredientUnit)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            {UNITS.map((u) => (
              <option key={u} value={u}>
                {INGREDIENT_UNIT_LABELS[u]}
              </option>
            ))}
          </select>
        </div>
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={submitting}
            className="px-4 py-2 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 disabled:opacity-50 transition"
          >
            {submitting ? "Saving…" : "Save"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-white border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition"
          >
            Cancel
          </button>
        </div>
        {error && <p className="w-full text-sm text-red-600">{error}</p>}
      </form>
    </div>
  );
}
