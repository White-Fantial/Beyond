"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { CreateRecipeInput, RecipeYieldUnit } from "@/types/owner-recipes";
import { RECIPE_YIELD_UNIT_LABELS } from "@/types/owner-recipes";
import type { IngredientUnit } from "@/types/owner-ingredients";
import { INGREDIENT_UNIT_LABELS } from "@/types/owner-ingredients";

const YIELD_UNITS = Object.keys(RECIPE_YIELD_UNIT_LABELS) as RecipeYieldUnit[];

interface StoreIngredient {
  id: string;
  name: string;
  unit: string;
}

interface IngredientRow {
  ingredientId: string;
  quantity: number;
  unit: IngredientUnit;
}

interface Props {
  storeId: string;
}

export default function NewRecipeForm({ storeId }: Props) {
  const router = useRouter();

  const [name, setName] = useState("");
  const [yieldQty, setYieldQty] = useState("1");
  const [yieldUnit, setYieldUnit] = useState<RecipeYieldUnit>("EACH");
  const [notes, setNotes] = useState("");
  const [instructions, setInstructions] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [ingredientRows, setIngredientRows] = useState<IngredientRow[]>([]);
  const [storeIngredients, setStoreIngredients] = useState<StoreIngredient[]>([]);
  const [loadingIngredients, setLoadingIngredients] = useState(true);

  useEffect(() => {
    if (!storeId) return;
    fetch(`/api/owner/ingredients?storeId=${storeId}&pageSize=500`)
      .then((r) => r.json())
      .then((json) => setStoreIngredients(json.data?.items ?? []))
      .catch(() => {})
      .finally(() => setLoadingIngredients(false));
  }, [storeId]);

  function addIngredientRow() {
    if (storeIngredients.length === 0) return;
    const first = storeIngredients[0];
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
      const body: CreateRecipeInput = {
        storeId,
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
      };
      const res = await fetch("/api/owner/recipes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Failed to create recipe.");
        return;
      }
      const { data } = await res.json();
      router.push(`/owner/recipes/${data.id}`);
    } catch {
      setError("A network error occurred. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Name + Yield */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
        <h2 className="text-sm font-semibold text-gray-900">Basic Information</h2>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Recipe Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Classic Bagel"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
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
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
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
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              {YIELD_UNITS.map((u) => (
                <option key={u} value={u}>
                  {RECIPE_YIELD_UNIT_LABELS[u]}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Notes (optional)
          </label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Additional notes…"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
      </div>

      {/* Ingredients */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-900">Ingredients</h2>
          <button
            type="button"
            onClick={addIngredientRow}
            disabled={loadingIngredients || storeIngredients.length === 0}
            className="text-xs text-brand-600 hover:text-brand-700 font-medium disabled:opacity-40"
          >
            {loadingIngredients ? "Loading…" : "+ Add Ingredient"}
          </button>
        </div>

        {!loadingIngredients && storeIngredients.length === 0 && (
          <p className="text-xs text-gray-400">
            No ingredients found. Add some under store ingredients first.
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
                  className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  {storeIngredients.map((ing) => (
                    <option key={ing.id} value={ing.id}>
                      {ing.name}
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
                  className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <div className="w-24">
                <label className="block text-xs text-gray-500 mb-1">Unit</label>
                <select
                  value={row.unit}
                  onChange={(e) => updateIngredientRow(idx, "unit", e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
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

      {/* Instructions */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-2">
        <h2 className="text-sm font-semibold text-gray-900">Instructions (optional)</h2>
        <textarea
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          rows={6}
          placeholder="Describe the cooking steps…"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-y"
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={submitting}
          className="px-5 py-2 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 disabled:opacity-50 transition"
        >
          {submitting ? "Creating…" : "Create Recipe"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/owner/recipes")}
          className="px-5 py-2 bg-white border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
