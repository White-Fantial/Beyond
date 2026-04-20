"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { RecipeIngredient, RecipeIngredientInput } from "@/types/owner-recipes";
import type { Ingredient, IngredientUnit } from "@/types/owner-ingredients";
import { INGREDIENT_UNIT_LABELS } from "@/types/owner-ingredients";

const UNITS = Object.keys(INGREDIENT_UNIT_LABELS) as IngredientUnit[];

interface Props {
  recipeId: string;
  storeId: string;
  currentIngredients: RecipeIngredient[];
  onClose: () => void;
}

export default function AddRecipeIngredientForm({
  recipeId,
  storeId,
  currentIngredients,
  onClose,
}: Props) {
  const router = useRouter();
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [loadingIngredients, setLoadingIngredients] = useState(true);
  const [ingredientId, setIngredientId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [unit, setUnit] = useState<IngredientUnit>("GRAM");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        // pageSize=500 handles most stores. Stores with more than 500 ingredients
        // will only see the first 500 in this selector.
        const res = await fetch(`/api/owner/ingredients?storeId=${storeId}&pageSize=500`);
        if (res.ok) {
          const json = await res.json();
          setIngredients(json.data?.items ?? []);
        }
      } finally {
        setLoadingIngredients(false);
      }
    }
    load();
  }, [storeId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const qty = parseFloat(quantity);
    if (!ingredientId) {
      setError("재료를 선택해주세요.");
      return;
    }
    if (!qty || qty <= 0) {
      setError("수량은 0보다 커야 합니다.");
      return;
    }

    const newIngredient: RecipeIngredientInput = {
      ingredientId,
      quantity: qty,
      unit,
    };

    const updatedIngredients: RecipeIngredientInput[] = [
      ...currentIngredients.map((i) => ({
        ingredientId: i.ingredientId,
        quantity: i.quantity,
        unit: i.unit,
      })),
      newIngredient,
    ];

    setSubmitting(true);
    try {
      const res = await fetch(`/api/owner/recipes/${recipeId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ingredients: updatedIngredients }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "재료 추가에 실패했습니다.");
        return;
      }
      router.refresh();
      onClose();
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="border-t border-gray-100 bg-gray-50 px-5 py-4">
      <h4 className="text-xs font-semibold text-gray-700 mb-3">재료 추가</h4>
      {loadingIngredients ? (
        <p className="text-xs text-gray-400">재료 목록 불러오는 중…</p>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[160px]">
            <label className="block text-xs font-medium text-gray-600 mb-1">
              재료 <span className="text-red-500">*</span>
            </label>
            <select
              required
              value={ingredientId}
              onChange={(e) => setIngredientId(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="">재료 선택…</option>
              {ingredients.map((ing) => (
                <option key={ing.id} value={ing.id}>
                  {ing.name} ({INGREDIENT_UNIT_LABELS[ing.unit] ?? ing.unit})
                </option>
              ))}
            </select>
          </div>
          <div className="w-24">
            <label className="block text-xs font-medium text-gray-600 mb-1">
              수량 <span className="text-red-500">*</span>
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
          <div className="w-28">
            <label className="block text-xs font-medium text-gray-600 mb-1">단위</label>
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
              {submitting ? "추가 중…" : "추가"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-white border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition"
            >
              취소
            </button>
          </div>
          {error && (
            <p className="w-full text-sm text-red-600">{error}</p>
          )}
        </form>
      )}
    </div>
  );
}
