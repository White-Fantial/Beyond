"use client";

import type {
  MarketplaceRecipeDetail,
  RecipeAccessResult,
} from "@/types/marketplace";
import { RECIPE_DIFFICULTY_LABELS } from "@/types/marketplace";
import { INGREDIENT_UNIT_LABELS } from "@/types/owner-ingredients";

interface RecipeDetailViewProps {
  recipe: MarketplaceRecipeDetail;
  access: RecipeAccessResult;
}

export default function RecipeDetailView({
  recipe,
  access,
}: RecipeDetailViewProps) {
  const totalMinutes =
    (recipe.prepTimeMinutes ?? 0) + (recipe.cookTimeMinutes ?? 0);

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Header */}
      <div>
        {recipe.thumbnailUrl && (
          <div className="rounded-xl overflow-hidden mb-6 aspect-video bg-gray-100">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={recipe.thumbnailUrl}
              alt={recipe.title}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        <div className="flex items-start justify-between gap-4 mb-4">
          <h1 className="text-2xl font-bold text-gray-900">{recipe.title}</h1>
          <span
            className={`shrink-0 inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
              recipe.type === "BASIC"
                ? "bg-green-100 text-green-700"
                : "bg-amber-100 text-amber-700"
            }`}
          >
            {recipe.type === "BASIC" ? "무료" : "프리미엄"}
          </span>
        </div>

        {recipe.description && (
          <p className="text-gray-600 mb-4">{recipe.description}</p>
        )}

        <div className="flex flex-wrap gap-4 text-sm text-gray-500">
          {recipe.cuisineTag && (
            <span className="bg-gray-100 px-3 py-1 rounded-full">
              {recipe.cuisineTag}
            </span>
          )}
          {recipe.difficulty && (
            <span className="bg-gray-100 px-3 py-1 rounded-full">
              {RECIPE_DIFFICULTY_LABELS[recipe.difficulty]}
            </span>
          )}
          {recipe.servings && (
            <span className="bg-gray-100 px-3 py-1 rounded-full">
              {recipe.servings}인분
            </span>
          )}
          {totalMinutes > 0 && (
            <span className="bg-gray-100 px-3 py-1 rounded-full">
              총 {totalMinutes}분
            </span>
          )}
        </div>
      </div>

      {/* Pricing */}
      {recipe.type === "PREMIUM" && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-amber-700 font-medium">판매가</p>
              <p className="text-2xl font-bold text-amber-900">
                {recipe.salePrice.toLocaleString("en-US", { style: "currency", currency: "USD" })}
              </p>
            </div>
            <div className="text-right text-sm text-amber-600">
              <p>원가: {recipe.estimatedCostPrice.toLocaleString("en-US", { style: "currency", currency: "USD" })}</p>
              <p>권장가: {recipe.recommendedPrice.toLocaleString("en-US", { style: "currency", currency: "USD" })}</p>
            </div>
          </div>

          {!access.hasAccess && (
            <div className="mt-4">
              <p className="text-sm text-amber-700 mb-3">
                이 프리미엄 레시피의 전체 내용을 보려면 구매가 필요합니다.
              </p>
              <button
                className="bg-amber-600 hover:bg-amber-700 text-white font-semibold px-6 py-2 rounded-lg text-sm"
                onClick={async () => {
                  await fetch(`/api/marketplace/recipes/${recipe.id}/purchase`, {
                    method: "POST",
                  });
                  window.location.reload();
                }}
              >
                구매하기 ({recipe.salePrice.toLocaleString("en-US", { style: "currency", currency: "USD" })})
              </button>
            </div>
          )}
        </div>
      )}

      {/* Ingredients */}
      <div className="bg-white rounded-lg border border-gray-200 p-5">
        <h2 className="text-base font-semibold text-gray-900 mb-4">
          재료 ({recipe.ingredientCount}가지)
        </h2>

        {!access.hasAccess && recipe.type === "PREMIUM" ? (
          <div className="text-center py-8 text-gray-400">
            <p className="text-2xl mb-2">🔒</p>
            <p className="text-sm">구매 후 재료 목록을 확인할 수 있습니다.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {recipe.ingredients.map((ing) => (
              <div
                key={ing.id}
                className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0"
              >
                <div>
                  <span className="text-sm font-medium text-gray-800">
                    {ing.ingredientName}
                  </span>
                  {ing.notes && (
                    <span className="text-xs text-gray-400 ml-2">
                      ({ing.notes})
                    </span>
                  )}
                </div>
                <span className="text-sm text-gray-600">
                  {ing.quantity}
                  {INGREDIENT_UNIT_LABELS[ing.unit as keyof typeof INGREDIENT_UNIT_LABELS]}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Steps */}
      <div className="bg-white rounded-lg border border-gray-200 p-5">
        <h2 className="text-base font-semibold text-gray-900 mb-4">
          만드는 과정
        </h2>

        {!access.hasAccess && recipe.type === "PREMIUM" ? (
          <div className="text-center py-8 text-gray-400">
            <p className="text-2xl mb-2">🔒</p>
            <p className="text-sm">구매 후 조리 과정을 확인할 수 있습니다.</p>
          </div>
        ) : (
          <ol className="space-y-6">
            {recipe.steps.map((step) => (
              <li key={step.id} className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 bg-orange-100 text-orange-700 rounded-full flex items-center justify-center text-sm font-bold">
                  {step.stepNumber}
                </div>
                <div className="flex-1 pt-1">
                  <p className="text-sm text-gray-700">{step.instruction}</p>
                  {step.durationMinutes && (
                    <p className="text-xs text-gray-400 mt-1">
                      ⏱ {step.durationMinutes}분
                    </p>
                  )}
                  {step.imageUrl && (
                    <div className="mt-2 rounded-lg overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={step.imageUrl}
                        alt={`Step ${step.stepNumber}`}
                        className="max-h-48 object-cover rounded-lg"
                      />
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}
