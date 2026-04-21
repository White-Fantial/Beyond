"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { RecipeDetail } from "@/types/owner-recipes";
import ProductRecipePanel from "@/components/owner/products/ProductRecipePanel";

interface StoreOption {
  id: string;
  name: string;
}

interface Props {
  tenantProductId: string;
  stores: StoreOption[];
  allRecipes: RecipeDetail[];
}

/**
 * Tenant-level product recipe section.
 *
 * Displays a store picker so the user can choose which store context to use
 * when creating or searching for a recipe. Recipes are scoped to a store
 * but linked to this shared tenant product.
 */
export default function TenantProductRecipeSection({ tenantProductId, stores, allRecipes }: Props) {
  const router = useRouter();
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(
    stores.length === 1 ? stores[0].id : null
  );

  // Filter recipes by selected store (show all when no store is selected)
  const visibleRecipes = selectedStoreId
    ? allRecipes.filter((r) => r.storeId === selectedStoreId)
    : allRecipes;

  if (stores.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-sm font-semibold text-gray-900 mb-1">Recipes</h2>
        <p className="text-sm text-gray-500">
          No stores are using this product yet. Add this product to a store first, then you can manage recipes.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Store picker (hidden when there is only one store) */}
      {stores.length > 1 && (
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-sm font-medium text-gray-600 shrink-0">Store context:</span>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setSelectedStoreId(null)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                selectedStoreId === null
                  ? "bg-brand-50 text-brand-700 border border-brand-200"
                  : "text-gray-500 border border-gray-200 hover:bg-gray-50"
              }`}
            >
              All Stores
            </button>
            {stores.map((store) => (
              <button
                key={store.id}
                type="button"
                onClick={() => setSelectedStoreId(store.id)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                  selectedStoreId === store.id
                    ? "bg-brand-50 text-brand-700 border border-brand-200"
                    : "text-gray-500 border border-gray-200 hover:bg-gray-50"
                }`}
              >
                {store.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {selectedStoreId ? (
        /* Full recipe panel (with create / search buttons) for the selected store */
        <ProductRecipePanel
          storeId={selectedStoreId}
          tenantCatalogProductId={tenantProductId}
          recipes={visibleRecipes}
        />
      ) : (
        /* "All stores" view — read-only summary, no create/search buttons */
        <div className="space-y-4">
          {allRecipes.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-sm font-semibold text-gray-900 mb-1">Recipes</h2>
              <p className="text-sm text-gray-500">
                No recipes linked to this product yet. Select a store above to add one.
              </p>
            </div>
          ) : (
            allRecipes.map((recipe) => {
              const storeName = stores.find((s) => s.id === recipe.storeId)?.name ?? recipe.storeId;
              return (
                <div key={recipe.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <div className="px-5 py-3 bg-gray-50 border-b border-gray-100 flex items-center gap-2">
                    <span className="text-xs font-medium text-gray-500">Store:</span>
                    <button
                      type="button"
                      onClick={() => setSelectedStoreId(recipe.storeId)}
                      className="text-xs font-medium text-brand-600 hover:text-brand-800"
                    >
                      {storeName}
                    </button>
                  </div>
                  <div className="px-5 py-4 flex items-center gap-3">
                    <span className="text-sm font-semibold text-gray-900">{recipe.name}</span>
                    {recipe.marketplaceSourceId && (
                      <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                        🏪 Platform Recipe
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
          {/* Prompt to select a store to manage recipes */}
          <div className="flex flex-wrap gap-2 pt-1">
            <span className="text-xs text-gray-500 self-center">Manage recipes for:</span>
            {stores.map((store) => (
              <button
                key={store.id}
                type="button"
                onClick={() => {
                  setSelectedStoreId(store.id);
                  router.refresh();
                }}
                className="text-xs font-medium px-3 py-1.5 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition"
              >
                {store.name} →
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
