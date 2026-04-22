"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type {
  CreateMarketplaceRecipeInput,
  UpdateMarketplaceRecipeInput,
  MarketplaceRecipeIngredientInput,
  MarketplaceRecipeDetail,
} from "@/types/marketplace";
import type { Ingredient } from "@/types/owner-ingredients";
import { INGREDIENT_UNIT_LABELS } from "@/types/owner-ingredients";
import { RECIPE_YIELD_UNIT_LABELS } from "@/types/owner-recipes";
import type { RecipeYieldUnit } from "@/types/owner-recipes";

const YIELD_UNITS = Object.keys(RECIPE_YIELD_UNIT_LABELS) as RecipeYieldUnit[];

interface RecipeFormProps {
  mode: "create" | "edit";
  initial?: MarketplaceRecipeDetail;
  platformIngredients: Ingredient[];
  recipeId?: string;
}

export default function RecipeForm({
  mode,
  initial,
  platformIngredients,
  recipeId,
}: RecipeFormProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [cuisineTag, setCuisineTag] = useState(initial?.cuisineTag ?? "");
  const [difficulty, setDifficulty] = useState(
    initial?.difficulty ?? "EASY"
  );
  const [servings, setServings] = useState(initial?.servings ?? 1);
  const [prepTime, setPrepTime] = useState(initial?.prepTimeMinutes ?? 0);
  const [cookTime, setCookTime] = useState(initial?.cookTimeMinutes ?? 0);
  const [yieldQty, setYieldQty] = useState(initial?.yieldQty ?? 1);
  const [yieldUnit, setYieldUnit] = useState<RecipeYieldUnit>(
    (initial?.yieldUnit as RecipeYieldUnit) ?? "EACH"
  );
  const [recommendedPrice, setRecommendedPrice] = useState(
    initial?.recommendedPrice ?? 0
  );
  const [salePrice, setSalePrice] = useState(initial?.salePrice ?? 0);
  const [currency] = useState(initial?.currency ?? "USD");
  const [instructions, setInstructions] = useState(initial?.instructions ?? "");

  const [ingredients, setIngredients] = useState<
    MarketplaceRecipeIngredientInput[]
  >(
    initial?.ingredients.map((i) => ({
      ingredientId: i.ingredientId,
      quantity: i.quantity,
      unit: i.unit,
      notes: i.notes ?? undefined,
    })) ?? []
  );

  // ── Ingredient helpers ───────────────────────────────────────────────────

  function addIngredient() {
    if (platformIngredients.length === 0) return;
    setIngredients((prev) => [
      ...prev,
      {
        ingredientId: platformIngredients[0].id,
        quantity: 1,
        unit: platformIngredients[0].unit,
      },
    ]);
  }

  function removeIngredient(idx: number) {
    setIngredients((prev) => prev.filter((_, i) => i !== idx));
  }

  function updateIngredient(
    idx: number,
    field: keyof MarketplaceRecipeIngredientInput,
    value: string | number
  ) {
    setIngredients((prev) =>
      prev.map((ing, i) => (i === idx ? { ...ing, [field]: value } : ing))
    );
  }

  // ── Submit ───────────────────────────────────────────────────────────────

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const payload: CreateMarketplaceRecipeInput | UpdateMarketplaceRecipeInput =
        {
          title,
          description: description || undefined,
          cuisineTag: cuisineTag || undefined,
          difficulty: difficulty as "EASY" | "MEDIUM" | "HARD",
          servings,
          prepTimeMinutes: prepTime || undefined,
          cookTimeMinutes: cookTime || undefined,
          yieldQty,
          yieldUnit,
          recommendedPrice,
          salePrice,
          currency,
          instructions: instructions || undefined,
          ingredients,
          ...(mode === "create" ? { type: "PREMIUM" as const } : {}),
        };

      let res: Response;
      if (mode === "create") {
        res = await fetch("/api/marketplace/recipes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch(`/api/marketplace/recipes/${recipeId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to save recipe.");
      }

      router.push("/provider/recipes");
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred.");
    } finally {
      setSaving(false);
    }
  }

  async function handleSubmitForReview() {
    if (!recipeId) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/marketplace/recipes/${recipeId}/submit`,
        { method: "POST" }
      );
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to submit for review.");
      }
      router.push("/provider/recipes");
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Basic Info */}
      <div className="bg-white rounded-lg border border-gray-200 p-5 space-y-4">
        <h2 className="text-sm font-semibold text-gray-700">Basic Information</h2>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Recipe Title *
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Cuisine Type
            </label>
            <input
              type="text"
              value={cuisineTag}
              onChange={(e) => setCuisineTag(e.target.value)}
              placeholder="e.g. Italian, Korean"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Difficulty
            </label>
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value as "EASY" | "MEDIUM" | "HARD")}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
            >
              <option value="EASY">Easy</option>
              <option value="MEDIUM">Medium</option>
              <option value="HARD">Hard</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Servings
            </label>
            <input
              type="number"
              min={1}
              value={servings}
              onChange={(e) => setServings(Number(e.target.value))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Prep Time (min)
            </label>
            <input
              type="number"
              min={0}
              value={prepTime}
              onChange={(e) => setPrepTime(Number(e.target.value))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Cook Time (min)
            </label>
            <input
              type="number"
              min={0}
              value={cookTime}
              onChange={(e) => setCookTime(Number(e.target.value))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Yield Qty <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min={1}
              required
              value={yieldQty}
              onChange={(e) => setYieldQty(Number(e.target.value))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
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
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
            >
              {YIELD_UNITS.map((u) => (
                <option key={u} value={u}>
                  {RECIPE_YIELD_UNIT_LABELS[u]}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Pricing */}
      <div className="bg-white rounded-lg border border-gray-200 p-5 space-y-4">
        <h2 className="text-sm font-semibold text-gray-700">Pricing</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Recommended Price ($)
            </label>
            <input
              type="number"
              min={0}
              value={recommendedPrice}
              onChange={(e) => setRecommendedPrice(Number(e.target.value))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Sale Price ($)
            </label>
            <input
              type="number"
              min={0}
              value={salePrice}
              onChange={(e) => setSalePrice(Number(e.target.value))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
          </div>
        </div>
      </div>

      {/* Ingredients */}
      <div className="bg-white rounded-lg border border-gray-200 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-700">Ingredients</h2>
          <button
            type="button"
            onClick={addIngredient}
            className="text-xs text-orange-600 hover:text-orange-700 font-medium"
          >
            + Add Ingredient
          </button>
        </div>

        {ingredients.length === 0 && (
          <p className="text-xs text-gray-400 text-center py-4">
            No ingredients added yet.
          </p>
        )}

        {ingredients.map((ing, idx) => (
          <div key={idx} className="flex gap-2 items-end">
            <div className="flex-1">
              <label className="block text-xs text-gray-500 mb-1">Ingredient</label>
              <select
                value={ing.ingredientId}
                onChange={(e) =>
                  updateIngredient(idx, "ingredientId", e.target.value)
                }
                className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
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
                value={ing.quantity}
                onChange={(e) =>
                  updateIngredient(idx, "quantity", Number(e.target.value))
                }
                className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
              />
            </div>
            <div className="w-24">
              <label className="block text-xs text-gray-500 mb-1">Unit</label>
              <select
                value={ing.unit}
                onChange={(e) => updateIngredient(idx, "unit", e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
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
              onClick={() => removeIngredient(idx)}
              className="text-red-400 hover:text-red-600 text-lg pb-1"
            >
              ×
            </button>
          </div>
        ))}
      </div>

      {/* Instructions */}
      <div className="bg-white rounded-lg border border-gray-200 p-5 space-y-4">
        <h2 className="text-sm font-semibold text-gray-700">Instructions</h2>
        <textarea
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          rows={6}
          placeholder="Describe the cooking steps…"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 resize-y"
        />
      </div>

      {/* Actions */}
      <div className="flex justify-between gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          Cancel
        </button>
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 text-sm bg-gray-100 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-200 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save Draft"}
          </button>
          {mode === "edit" && recipeId && (
            <button
              type="button"
              disabled={saving}
              onClick={handleSubmitForReview}
              className="px-4 py-2 text-sm bg-orange-600 hover:bg-orange-700 text-white rounded-lg disabled:opacity-50"
            >
              {saving ? "Submitting…" : "Submit for Review"}
            </button>
          )}
        </div>
      </div>
    </form>
  );
}
