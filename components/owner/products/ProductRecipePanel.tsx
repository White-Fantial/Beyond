"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { RecipeDetail } from "@/types/owner-recipes";
import RecipeCostBreakdown from "@/components/owner/recipes/RecipeCostBreakdown";
import ProductRecipeActions from "@/components/owner/products/ProductRecipeActions";

interface Props {
  catalogProductId?: string;
  tenantCatalogProductId?: string;
  recipes: RecipeDetail[];
}

function RecipeBadge({ recipe }: { recipe: RecipeDetail }) {
  if (recipe.marketplaceSourceId) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
        🏪 Platform Recipe
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700">
      ✏️ Custom Recipe
    </span>
  );
}

function DeleteRecipeButton({ recipeId }: { recipeId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    if (!confirm("Are you sure you want to delete this recipe? This action cannot be undone.")) {
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch(`/api/owner/recipes/${recipeId}`, { method: "DELETE" });
        if (!res.ok) {
          const data = await res.json();
          setError(data.error ?? "Failed to delete recipe.");
          return;
        }
        router.refresh();
      } catch {
        setError("A network error occurred. Please try again.");
      }
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={handleDelete}
        disabled={isPending}
        className="text-xs font-medium text-red-500 hover:text-red-700 disabled:opacity-50 transition"
      >
        {isPending ? "Deleting…" : "Delete Recipe"}
      </button>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}

export default function ProductRecipePanel({ catalogProductId, tenantCatalogProductId, recipes }: Props) {
  return (
    <div className="space-y-6">
      {recipes.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-1">Recipe</h2>
          <p className="text-sm text-gray-500">
            No recipe is linked to this product yet. Search the marketplace to import one, or create your own from scratch.
          </p>
          <ProductRecipeActions
            catalogProductId={catalogProductId}
            tenantCatalogProductId={tenantCatalogProductId}
          />
        </div>
      ) : (
        <>
          {recipes.map((recipe) => (
            <div key={recipe.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <h2 className="text-sm font-semibold text-gray-900 truncate">{recipe.name}</h2>
                  <RecipeBadge recipe={recipe} />
                  {recipe.marketplaceSourceId && (
                    <span className="text-xs text-gray-400">
                      (copied from marketplace — fully editable)
                    </span>
                  )}
                </div>
                <DeleteRecipeButton recipeId={recipe.id} />
              </div>
              <div className="p-5">
                <RecipeCostBreakdown detail={recipe} canEdit />
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
