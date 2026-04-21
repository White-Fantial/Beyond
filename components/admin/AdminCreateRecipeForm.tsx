"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { RecipeYieldUnit } from "@/types/owner-recipes";
import { RECIPE_YIELD_UNIT_LABELS } from "@/types/owner-recipes";
import type { IngredientUnit } from "@/types/owner-ingredients";
import { INGREDIENT_UNIT_LABELS } from "@/types/owner-ingredients";

const YIELD_UNITS = Object.keys(RECIPE_YIELD_UNIT_LABELS) as RecipeYieldUnit[];

interface PlatformIngredient {
  id: string;
  name: string;
  unit: string;
  category: string | null;
}

interface IngredientRow {
  ingredientId: string;
  quantity: number;
  unit: IngredientUnit;
}

export default function AdminCreateRecipeForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [yieldQty, setYieldQty] = useState("1");
  const [yieldUnit, setYieldUnit] = useState<RecipeYieldUnit>("EACH");
  const [notes, setNotes] = useState("");
  const [instructions, setInstructions] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Ingredient rows
  const [ingredientRows, setIngredientRows] = useState<IngredientRow[]>([]);
  const [platformIngredients, setPlatformIngredients] = useState<PlatformIngredient[]>([]);
  const [loadingIngredients, setLoadingIngredients] = useState(false);

  // Load platform ingredients when the form is opened
  useEffect(() => {
    if (!open) return;
    setLoadingIngredients(true);
    fetch("/api/admin/platform-ingredients?pageSize=200")
      .then((r) => r.json())
      .then((json) => {
        const items: PlatformIngredient[] = json.data?.items ?? [];
        setPlatformIngredients(items);
      })
      .catch(() => {
        // Non-fatal: ingredient selection just won't be available
      })
      .finally(() => setLoadingIngredients(false));
  }, [open]);

  function addIngredientRow() {
    if (platformIngredients.length === 0) return;
    const first = platformIngredients[0];
    setIngredientRows((prev) => [
      ...prev,
      { ingredientId: first.id, quantity: 1, unit: first.unit as IngredientUnit },
    ]);
  }

  function removeIngredientRow(idx: number) {
    setIngredientRows((prev) => prev.filter((_, i) => i !== idx));
  }

  function updateIngredientRow(
    idx: number,
    field: keyof IngredientRow,
    value: string | number
  ) {
    setIngredientRows((prev) =>
      prev.map((row, i) => (i === idx ? { ...row, [field]: value } : row))
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const qty = parseInt(yieldQty, 10);
    if (!name.trim()) {
      setError("Please enter a recipe name.");
      return;
    }
    if (!qty || qty < 1) {
      setError("Yield quantity must be at least 1.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/recipes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          yieldQty: qty,
          yieldUnit,
          notes: notes.trim() || undefined,
          instructions: instructions.trim() || undefined,
          ingredients: ingredientRows.map((r) => ({
            ingredientId: r.ingredientId,
            quantity: r.quantity,
            unit: r.unit,
          })),
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Failed to create recipe.");
        return;
      }
      // Reset form and refresh
      setName("");
      setYieldQty("1");
      setYieldUnit("EACH");
      setNotes("");
      setInstructions("");
      setIngredientRows([]);
      setOpen(false);
      router.refresh();
    } catch {
      setError("A network error occurred.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="px-4 py-2 bg-red-700 text-white text-sm font-medium rounded-lg hover:bg-red-800 transition"
      >
        + Add Recipe
      </button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white rounded-xl border border-gray-200 p-5 space-y-4"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-900">Add Recipe</h2>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-xs text-gray-400 hover:text-gray-600"
        >
          Close
        </button>
      </div>

      {/* Name + Yield */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="sm:col-span-1">
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Recipe Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Classic Bagel"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Yield Qty <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            min="1"
            required
            value={yieldQty}
            onChange={(e) => setYieldQty(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Yield Unit <span className="text-red-500">*</span>
          </label>
          <select
            required
            value={yieldUnit}
            onChange={(e) => setYieldUnit(e.target.value as RecipeYieldUnit)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            {YIELD_UNITS.map((u) => (
              <option key={u} value={u}>
                {RECIPE_YIELD_UNIT_LABELS[u]}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Notes */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Notes (optional)</label>
        <input
          type="text"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Additional notes…"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
        />
      </div>

      {/* Instructions */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">
          Instructions (optional)
        </label>
        <textarea
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          rows={4}
          placeholder="Describe the cooking steps…"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 resize-y"
        />
      </div>

      {/* Ingredients */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-xs font-medium text-gray-600">
            Ingredients (optional)
          </label>
          <button
            type="button"
            onClick={addIngredientRow}
            disabled={loadingIngredients || platformIngredients.length === 0}
            className="text-xs text-red-700 hover:text-red-800 font-medium disabled:opacity-40"
          >
            {loadingIngredients ? "Loading…" : "+ Add Ingredient"}
          </button>
        </div>

        {ingredientRows.length === 0 && !loadingIngredients && platformIngredients.length === 0 && (
          <p className="text-xs text-gray-400">
            No platform ingredients available. Add some under Platform Ingredients first.
          </p>
        )}

        <div className="space-y-2">
          {ingredientRows.map((row, idx) => (
            <div key={idx} className="flex gap-2 items-end">
              <div className="flex-1">
                <label className="block text-xs text-gray-500 mb-1">Ingredient</label>
                <select
                  value={row.ingredientId}
                  onChange={(e) => updateIngredientRow(idx, "ingredientId", e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  {platformIngredients.map((pi) => (
                    <option key={pi.id} value={pi.id}>
                      {pi.name}
                      {pi.category ? ` (${pi.category})` : ""}
                    </option>
                  ))}
                </select>
              </div>
              <div className="w-24">
                <label className="block text-xs text-gray-500 mb-1">Qty</label>
                <input
                  type="number"
                  min={0}
                  step={0.1}
                  value={row.quantity}
                  onChange={(e) => updateIngredientRow(idx, "quantity", Number(e.target.value))}
                  className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
              <div className="w-24">
                <label className="block text-xs text-gray-500 mb-1">Unit</label>
                <select
                  value={row.unit}
                  onChange={(e) => updateIngredientRow(idx, "unit", e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  {Object.entries(INGREDIENT_UNIT_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                onClick={() => removeIngredientRow(idx)}
                className="text-red-400 hover:text-red-600 text-lg pb-1"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={submitting}
          className="px-5 py-2 bg-red-700 text-white text-sm font-medium rounded-lg hover:bg-red-800 disabled:opacity-50 transition"
        >
          {submitting ? "Creating…" : "Add Recipe"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="px-5 py-2 bg-white border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
