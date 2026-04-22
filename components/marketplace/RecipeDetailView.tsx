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
            {recipe.type === "BASIC" ? "Free" : "Premium"}
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
              {recipe.servings} servings
            </span>
          )}
          {totalMinutes > 0 && (
            <span className="bg-gray-100 px-3 py-1 rounded-full">
              {totalMinutes} min total
            </span>
          )}
        </div>
      </div>

      {/* Pricing */}
      {recipe.type === "PREMIUM" && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-amber-700 font-medium">Sale Price</p>
              <p className="text-2xl font-bold text-amber-900">
                {(recipe.salePrice / 100000).toLocaleString("en-US", { style: "currency", currency: "USD" })}
              </p>
            </div>
            <div className="text-right text-sm text-amber-600">
              <p>Cost: {(recipe.estimatedCostPrice / 100000).toLocaleString("en-US", { style: "currency", currency: "USD" })}</p>
              <p>Suggested: {(recipe.recommendedPrice / 100000).toLocaleString("en-US", { style: "currency", currency: "USD" })}</p>
            </div>
          </div>

          {!access.hasAccess && (
            <div className="mt-4">
              <p className="text-sm text-amber-700 mb-3">
                Purchase this premium recipe to view the full content.
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
                Purchase ({(recipe.salePrice / 100000).toLocaleString("en-US", { style: "currency", currency: "USD" })})
              </button>
            </div>
          )}
        </div>
      )}

      {/* Ingredients */}
      <div className="bg-white rounded-lg border border-gray-200 p-5">
        <h2 className="text-base font-semibold text-gray-900 mb-4">
          Ingredients ({recipe.ingredientCount})
        </h2>

        {!access.hasAccess && recipe.type === "PREMIUM" ? (
          <div className="text-center py-8 text-gray-400">
            <p className="text-2xl mb-2">🔒</p>
            <p className="text-sm">Purchase to view ingredients.</p>
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

      {/* Instructions */}
      <div className="bg-white rounded-lg border border-gray-200 p-5">
        <h2 className="text-base font-semibold text-gray-900 mb-4">
          Instructions
        </h2>

        {!access.hasAccess && recipe.type === "PREMIUM" ? (
          <div className="text-center py-8 text-gray-400">
            <p className="text-2xl mb-2">🔒</p>
            <p className="text-sm">Purchase to view instructions.</p>
          </div>
        ) : recipe.instructions ? (
          <p className="text-sm text-gray-700 whitespace-pre-line">{recipe.instructions}</p>
        ) : (
          <p className="text-sm text-gray-400 italic">No instructions provided.</p>
        )}
      </div>
    </div>
  );
}
