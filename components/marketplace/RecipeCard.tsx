"use client";

import type { MarketplaceRecipe } from "@/types/marketplace";
import { MARKETPLACE_RECIPE_STATUS_LABELS } from "@/types/marketplace";
import Link from "next/link";

interface RecipeCardProps {
  recipe: MarketplaceRecipe;
}

export default function RecipeCard({ recipe }: RecipeCardProps) {
  const statusLabel = MARKETPLACE_RECIPE_STATUS_LABELS[recipe.status];
  const isPublished = recipe.status === "PUBLISHED";

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
      {recipe.thumbnailUrl && (
        <div className="aspect-video bg-gray-100">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={recipe.thumbnailUrl}
            alt={recipe.title}
            className="w-full h-full object-cover"
          />
        </div>
      )}
      {!recipe.thumbnailUrl && (
        <div className="aspect-video bg-gradient-to-br from-orange-50 to-amber-50 flex items-center justify-center">
          <span className="text-4xl">🍽️</span>
        </div>
      )}

      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="font-semibold text-gray-900 text-sm leading-tight line-clamp-2">
            {recipe.title}
          </h3>
          <span
            className={`shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
              recipe.type === "BASIC"
                ? "bg-green-100 text-green-700"
                : "bg-amber-100 text-amber-700"
            }`}
          >
            {recipe.type === "BASIC" ? "무료" : "프리미엄"}
          </span>
        </div>

        {recipe.description && (
          <p className="text-xs text-gray-500 line-clamp-2 mb-3">
            {recipe.description}
          </p>
        )}

        <div className="flex flex-wrap gap-2 text-xs text-gray-400 mb-3">
          {recipe.cuisineTag && <span>{recipe.cuisineTag}</span>}
          {recipe.difficulty && (
            <span>
              {recipe.difficulty === "EASY"
                ? "쉬움"
                : recipe.difficulty === "MEDIUM"
                ? "보통"
                : "어려움"}
            </span>
          )}
          {recipe.servings && <span>{recipe.servings}인분</span>}
        </div>

        <div className="flex items-center justify-between">
          {recipe.type === "BASIC" ? (
            <span className="text-sm font-semibold text-green-600">무료</span>
          ) : (
            <span className="text-sm font-semibold text-gray-900">
              {recipe.salePrice.toLocaleString("en-US", { style: "currency", currency: "USD" })}
            </span>
          )}

          {isPublished ? (
            <Link
              href={`/marketplace/${recipe.id}`}
              className="text-xs text-blue-600 hover:underline font-medium"
            >
              자세히 보기 →
            </Link>
          ) : (
            <span className="text-xs text-gray-400">{statusLabel}</span>
          )}
        </div>
      </div>
    </div>
  );
}
