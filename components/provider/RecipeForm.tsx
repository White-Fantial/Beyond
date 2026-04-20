"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type {
  CreateMarketplaceRecipeInput,
  UpdateMarketplaceRecipeInput,
  MarketplaceRecipeStepInput,
  MarketplaceRecipeIngredientInput,
  MarketplaceRecipeDetail,
} from "@/types/marketplace";
import type { Ingredient } from "@/types/owner-ingredients";
import { INGREDIENT_UNIT_LABELS } from "@/types/owner-ingredients";

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
  const [yieldQty] = useState(initial?.yieldQty ?? 1);
  const [yieldUnit] = useState(
    initial?.yieldUnit ?? "EACH"
  );
  const [recommendedPrice, setRecommendedPrice] = useState(
    initial?.recommendedPrice ?? 0
  );
  const [salePrice, setSalePrice] = useState(initial?.salePrice ?? 0);
  const [currency] = useState(initial?.currency ?? "USD");

  const [steps, setSteps] = useState<MarketplaceRecipeStepInput[]>(
    initial?.steps.map((s) => ({
      stepNumber: s.stepNumber,
      instruction: s.instruction,
      imageUrl: s.imageUrl ?? undefined,
      durationMinutes: s.durationMinutes ?? undefined,
    })) ?? [{ stepNumber: 1, instruction: "" }]
  );

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

  // ── Step helpers ─────────────────────────────────────────────────────────

  function addStep() {
    setSteps((prev) => [
      ...prev,
      { stepNumber: prev.length + 1, instruction: "" },
    ]);
  }

  function removeStep(idx: number) {
    setSteps((prev) =>
      prev
        .filter((_, i) => i !== idx)
        .map((s, i) => ({ ...s, stepNumber: i + 1 }))
    );
  }

  function updateStep(
    idx: number,
    field: keyof MarketplaceRecipeStepInput,
    value: string | number
  ) {
    setSteps((prev) =>
      prev.map((s, i) => (i === idx ? { ...s, [field]: value } : s))
    );
  }

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
          yieldUnit: yieldUnit as "EACH" | "BATCH" | "SERVING" | "GRAM" | "KG" | "ML" | "LITER",
          recommendedPrice,
          salePrice,
          currency,
          steps,
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
        throw new Error(data.error ?? "저장에 실패했습니다.");
      }

      router.push("/provider/recipes");
    } catch (err) {
      setError(err instanceof Error ? err.message : "오류가 발생했습니다.");
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
        throw new Error(data.error ?? "검토 제출에 실패했습니다.");
      }
      router.push("/provider/recipes");
    } catch (err) {
      setError(err instanceof Error ? err.message : "오류가 발생했습니다.");
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
        <h2 className="text-sm font-semibold text-gray-700">기본 정보</h2>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            레시피 이름 *
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
            설명
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
              요리 분류
            </label>
            <input
              type="text"
              value={cuisineTag}
              onChange={(e) => setCuisineTag(e.target.value)}
              placeholder="예: 한식, 이탈리안"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              난이도
            </label>
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value as "EASY" | "MEDIUM" | "HARD")}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
            >
              <option value="EASY">쉬움</option>
              <option value="MEDIUM">보통</option>
              <option value="HARD">어려움</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              몇 인분
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
              준비 시간 (분)
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
              조리 시간 (분)
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
      </div>

      {/* Pricing */}
      <div className="bg-white rounded-lg border border-gray-200 p-5 space-y-4">
        <h2 className="text-sm font-semibold text-gray-700">가격 설정</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              권장 판매가 ($)
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
              실제 판매가 ($)
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
          <h2 className="text-sm font-semibold text-gray-700">재료 목록</h2>
          <button
            type="button"
            onClick={addIngredient}
            className="text-xs text-orange-600 hover:text-orange-700 font-medium"
          >
            + 재료 추가
          </button>
        </div>

        {ingredients.length === 0 && (
          <p className="text-xs text-gray-400 text-center py-4">
            재료를 추가해주세요.
          </p>
        )}

        {ingredients.map((ing, idx) => (
          <div key={idx} className="flex gap-2 items-end">
            <div className="flex-1">
              <label className="block text-xs text-gray-500 mb-1">재료</label>
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
              <label className="block text-xs text-gray-500 mb-1">수량</label>
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
              <label className="block text-xs text-gray-500 mb-1">단위</label>
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

      {/* Steps */}
      <div className="bg-white rounded-lg border border-gray-200 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-700">만드는 과정</h2>
          <button
            type="button"
            onClick={addStep}
            className="text-xs text-orange-600 hover:text-orange-700 font-medium"
          >
            + 단계 추가
          </button>
        </div>

        {steps.map((step, idx) => (
          <div
            key={idx}
            className="flex gap-3 items-start p-3 bg-gray-50 rounded-lg"
          >
            <div className="w-7 h-7 bg-orange-100 text-orange-700 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-1">
              {step.stepNumber}
            </div>
            <div className="flex-1 space-y-2">
              <textarea
                value={step.instruction}
                onChange={(e) =>
                  updateStep(idx, "instruction", e.target.value)
                }
                required
                rows={2}
                placeholder="조리 단계를 설명해주세요"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
              />
              <div className="flex gap-2">
                <input
                  type="number"
                  min={0}
                  value={step.durationMinutes ?? ""}
                  onChange={(e) =>
                    updateStep(
                      idx,
                      "durationMinutes",
                      e.target.value ? Number(e.target.value) : 0
                    )
                  }
                  placeholder="소요 시간 (분)"
                  className="w-36 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                />
              </div>
            </div>
            <button
              type="button"
              onClick={() => removeStep(idx)}
              disabled={steps.length <= 1}
              className="text-red-400 hover:text-red-600 text-lg disabled:opacity-30"
            >
              ×
            </button>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex justify-between gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          취소
        </button>
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 text-sm bg-gray-100 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-200 disabled:opacity-50"
          >
            {saving ? "저장 중..." : "임시 저장"}
          </button>
          {mode === "edit" && recipeId && (
            <button
              type="button"
              disabled={saving}
              onClick={handleSubmitForReview}
              className="px-4 py-2 text-sm bg-orange-600 hover:bg-orange-700 text-white rounded-lg disabled:opacity-50"
            >
              {saving ? "처리 중..." : "검토 제출"}
            </button>
          )}
        </div>
      </div>
    </form>
  );
}
