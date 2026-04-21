"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { MarketplaceRecipe, MarketplaceRecipeType } from "@/types/marketplace";
import type { RecipeYieldUnit } from "@/types/owner-recipes";
import { RECIPE_YIELD_UNIT_LABELS } from "@/types/owner-recipes";
import type { IngredientUnit } from "@/types/owner-ingredients";
import { INGREDIENT_UNIT_LABELS } from "@/types/owner-ingredients";

const YIELD_UNITS = Object.keys(RECIPE_YIELD_UNIT_LABELS) as RecipeYieldUnit[];

interface Props {
  storeId: string;
  /** Store-level CatalogProduct ID — set when managing recipes from a store product page. */
  catalogProductId?: string;
  /** Tenant-level TenantCatalogProduct ID — set when managing recipes from the global product catalog. */
  tenantCatalogProductId?: string;
}

interface MarketplaceSearchResult {
  items: MarketplaceRecipe[];
  total: number;
}

// ─── Marketplace search sub-panel ─────────────────────────────────────────────

function MarketplaceSearchPanel({
  storeId,
  catalogProductId,
  tenantCatalogProductId,
  onDone,
}: {
  storeId: string;
  catalogProductId?: string;
  tenantCatalogProductId?: string;
  onDone: () => void;
}) {
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<MarketplaceRecipeType | "ALL">("ALL");
  const [result, setResult] = useState<MarketplaceSearchResult | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [copyingId, setCopyingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copyError, setCopyError] = useState<string | null>(null);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setSearchError(null);
    setCopiedId(null);

    startTransition(async () => {
      try {
        const params = new URLSearchParams({ status: "PUBLISHED", pageSize: "30" });
        if (query.trim()) params.set("q", query.trim());
        if (typeFilter !== "ALL") params.set("type", typeFilter);

        const res = await fetch(`/api/marketplace/recipes?${params.toString()}`);
        if (!res.ok) {
          setSearchError("Search failed. Please try again.");
          return;
        }
        const json = await res.json();
        setResult(json.data as MarketplaceSearchResult);
      } catch {
        setSearchError("Network error. Please try again.");
      }
    });
  }

  async function handleCopy(recipe: MarketplaceRecipe) {
    setCopyError(null);
    setCopyingId(recipe.id);
    try {
      const res = await fetch(`/api/marketplace/recipes/${recipe.id}/copy`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storeId, catalogProductId, tenantCatalogProductId }),
      });
      if (!res.ok) {
        const data = await res.json();
        setCopyError(data.error ?? "Failed to copy recipe");
        return;
      }
      setCopiedId(recipe.id);
      onDone();
    } catch {
      setCopyError("Network error. Please try again.");
    } finally {
      setCopyingId(null);
    }
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-2">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search marketplace recipes…"
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as MarketplaceRecipeType | "ALL")}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
        >
          <option value="ALL">All (Free + Premium)</option>
          <option value="BASIC">Free only</option>
          <option value="PREMIUM">Premium only</option>
        </select>
        <button
          type="submit"
          disabled={isPending}
          className="px-4 py-2 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 disabled:opacity-50 transition"
        >
          {isPending ? "Searching…" : "Search"}
        </button>
      </form>

      {searchError && (
        <p className="text-sm text-red-600">{searchError}</p>
      )}
      {copyError && (
        <p className="text-sm text-red-600">{copyError}</p>
      )}

      {result !== null && (
        <div>
          <p className="text-xs text-gray-500 mb-2">
            {result.total} result{result.total !== 1 ? "s" : ""}
          </p>
          {result.items.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">
              No recipes found. Try a different keyword.
            </p>
          ) : (
            <div className="space-y-1 max-h-80 overflow-y-auto">
              {result.items.map((recipe) => (
                <div
                  key={recipe.id}
                  className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg border border-gray-100 hover:border-gray-200 hover:bg-gray-50"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-gray-800 truncate">{recipe.title}</div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span
                        className={`text-xs font-medium px-1.5 py-0.5 rounded ${
                          recipe.type === "PREMIUM"
                            ? "bg-yellow-100 text-yellow-700"
                            : "bg-green-100 text-green-700"
                        }`}
                      >
                        {recipe.type === "PREMIUM" ? "Premium" : "Free"}
                      </span>
                      {recipe.description && (
                        <span className="text-xs text-gray-400 truncate">{recipe.description}</span>
                      )}
                    </div>
                  </div>
                  <div className="shrink-0">
                    {copiedId === recipe.id ? (
                      <span className="text-xs font-medium text-green-600">✓ Added</span>
                    ) : (
                      <button
                        type="button"
                        disabled={copyingId === recipe.id}
                        onClick={() => handleCopy(recipe)}
                        className="text-xs font-medium text-brand-600 hover:text-brand-800 px-2 py-1 rounded hover:bg-brand-50 disabled:opacity-50 transition"
                      >
                        {copyingId === recipe.id ? "Adding…" : "Use this →"}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {result === null && !isPending && (
        <div className="text-center text-sm text-gray-400 py-6 bg-gray-50 rounded-lg border border-dashed border-gray-200">
          <p className="text-xl mb-1">🍽️</p>
          <p>Search the marketplace to find a recipe to use for this product.</p>
          <p className="mt-0.5 text-xs">The recipe will be copied and linked to this product.</p>
        </div>
      )}
    </div>
  );
}

// ─── Create recipe sub-panel ──────────────────────────────────────────────────

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

function CreateRecipePanel({
  storeId,
  catalogProductId,
  tenantCatalogProductId,
  onDone,
}: {
  storeId: string;
  catalogProductId?: string;
  tenantCatalogProductId?: string;
  onDone: () => void;
}) {
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

  // Load store-scope ingredients on mount
  useEffect(() => {
    fetch(`/api/owner/ingredients?storeId=${encodeURIComponent(storeId)}&pageSize=200`)
      .then((r) => r.json())
      .then((json) => {
        setStoreIngredients(json.data?.items ?? []);
      })
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
    if (!qty || qty < 1) {
      setError("Yield quantity must be at least 1");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/owner/recipes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeId,
          catalogProductId,
          tenantCatalogProductId,
          name,
          yieldQty: qty,
          yieldUnit,
          notes: notes || undefined,
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
        setError(data.error ?? "Failed to create recipe");
        return;
      }
      router.refresh();
      onDone();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
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
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
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
        <label className="block text-xs font-medium text-gray-600 mb-1">Notes (optional)</label>
        <input
          type="text"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Additional notes…"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">
          Instructions (optional)
        </label>
        <textarea
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          rows={4}
          placeholder="Describe the cooking steps…"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-y"
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
            disabled={loadingIngredients || storeIngredients.length === 0}
            className="text-xs text-brand-600 hover:text-brand-800 font-medium disabled:opacity-40"
          >
            {loadingIngredients ? "Loading…" : "+ Add Ingredient"}
          </button>
        </div>

        {!loadingIngredients && storeIngredients.length === 0 && (
          <p className="text-xs text-gray-400">
            No ingredients found for this store. Add ingredients first under Cost Management.
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

      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={submitting}
        className="px-5 py-2 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 disabled:opacity-50 transition"
      >
        {submitting ? "Creating…" : "Create Recipe"}
      </button>
    </form>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

type Mode = "none" | "marketplace" | "create";

export default function ProductRecipeActions({ storeId, catalogProductId, tenantCatalogProductId }: Props) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("none");

  function handleDone() {
    setMode("none");
    router.refresh();
  }

  if (mode === "none") {
    return (
      <div className="flex flex-wrap gap-3 mt-4">
        <button
          type="button"
          onClick={() => setMode("marketplace")}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition"
        >
          🏪 Search Marketplace
        </button>
        <button
          type="button"
          onClick={() => setMode("create")}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-white border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition"
        >
          ✏️ Create Recipe
        </button>
      </div>
    );
  }

  return (
    <div className="mt-4 bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setMode("marketplace")}
            className={`text-sm font-medium px-3 py-1.5 rounded-lg transition ${
              mode === "marketplace"
                ? "bg-blue-50 text-blue-700 border border-blue-200"
                : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
            }`}
          >
            🏪 Search Marketplace
          </button>
          <button
            type="button"
            onClick={() => setMode("create")}
            className={`text-sm font-medium px-3 py-1.5 rounded-lg transition ${
              mode === "create"
                ? "bg-brand-50 text-brand-700 border border-brand-200"
                : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
            }`}
          >
            ✏️ Create Recipe
          </button>
        </div>
        <button
          type="button"
          onClick={() => setMode("none")}
          className="text-xs text-gray-400 hover:text-gray-600"
        >
          ✕ Close
        </button>
      </div>

      {mode === "marketplace" && (
        <MarketplaceSearchPanel
          storeId={storeId}
          catalogProductId={catalogProductId}
          tenantCatalogProductId={tenantCatalogProductId}
          onDone={handleDone}
        />
      )}
      {mode === "create" && (
        <CreateRecipePanel
          storeId={storeId}
          catalogProductId={catalogProductId}
          tenantCatalogProductId={tenantCatalogProductId}
          onDone={handleDone}
        />
      )}
    </div>
  );
}
