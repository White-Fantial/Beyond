"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Ingredient, IngredientUnit } from "@/types/owner-ingredients";
import { INGREDIENT_UNIT_LABELS } from "@/types/owner-ingredients";

interface SearchResult {
  items: Ingredient[];
  total: number;
}

/**
 * Panel for browsing PLATFORM ingredients and registering them for the current tenant.
 * Replaces the old ImportPlatformIngredientPanel — instead of creating STORE-scope copies,
 * this creates TenantIngredient registration records so the PLATFORM ingredient identity
 * is preserved and shared supplier links remain accessible.
 */
export default function PlatformIngredientRegistrationPanel() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [result, setResult] = useState<SearchResult | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [registering, setRegistering] = useState<string | null>(null);
  const [registeredIds, setRegisteredIds] = useState<Set<string>>(new Set());
  const [registerError, setRegisterError] = useState<string | null>(null);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setSearchError(null);
    setRegisterError(null);

    startTransition(async () => {
      try {
        const params = new URLSearchParams({ pageSize: "40" });
        if (query.trim()) params.set("q", query.trim());
        if (categoryFilter.trim()) params.set("category", categoryFilter.trim());
        const res = await fetch(`/api/owner/platform-ingredients?${params.toString()}`);
        if (!res.ok) {
          setSearchError("Search failed. Please try again.");
          return;
        }
        const json = await res.json();
        setResult(json.data as SearchResult);
      } catch {
        setSearchError("Network error. Please try again.");
      }
    });
  }

  async function handleRegister(ing: Ingredient) {
    setRegisterError(null);
    setRegistering(ing.id);
    try {
      const res = await fetch("/api/owner/tenant-ingredients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ingredientId: ing.id }),
      });
      if (!res.ok) {
        const data = await res.json();
        setRegisterError(data.error ?? "Registration failed");
        return;
      }
      setRegisteredIds((prev) => new Set([...prev, ing.id]));
      router.refresh();
    } catch {
      setRegisterError("Network error. Please try again.");
    } finally {
      setRegistering(null);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 px-4 py-2 bg-white border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition"
      >
        🌐 Browse Platform Ingredients
      </button>
    );
  }

  // Collect unique categories from current results for quick filter suggestions
  const categories: string[] = [];
  if (result) {
    const seen = new Set<string>();
    for (const ing of result.items) {
      if (ing.category && !seen.has(ing.category)) {
        seen.add(ing.category);
        categories.push(ing.category);
      }
    }
    categories.sort();
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-900">Browse Platform Ingredients</h2>
        <button
          type="button"
          onClick={() => { setOpen(false); setResult(null); setRegisteredIds(new Set()); }}
          className="text-xs text-gray-400 hover:text-gray-600"
        >
          ✕ Close
        </button>
      </div>
      <p className="text-xs text-gray-500">
        Register a platform ingredient to use it in your recipes and set your own preferred
        supplier-product links with per-tenant pricing.
      </p>

      <form onSubmit={handleSearch} className="space-y-2">
        <div className="flex gap-2">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by ingredient name…"
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          <input
            type="text"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            placeholder="Category filter…"
            className="w-36 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          <button
            type="submit"
            disabled={isPending}
            className="px-4 py-2 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 disabled:opacity-50 transition"
          >
            {isPending ? "Searching…" : "Search"}
          </button>
        </div>
        {categories.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            <span className="text-xs text-gray-400">Quick filter:</span>
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => {
                  setCategoryFilter(cat === categoryFilter ? "" : cat);
                }}
                className={`text-xs px-2 py-0.5 rounded-full border transition-colors ${
                  categoryFilter === cat
                    ? "border-brand-500 bg-brand-50 text-brand-700"
                    : "border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}
      </form>

      {searchError && <p className="text-sm text-red-600">{searchError}</p>}
      {registerError && <p className="text-sm text-red-600">{registerError}</p>}

      {result !== null && (
        <div>
          <p className="text-xs text-gray-500 mb-2">
            {result.total} result{result.total !== 1 ? "s" : ""}
          </p>
          {result.items.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">
              No platform ingredients found. Try a different keyword.
            </p>
          ) : (
            <div className="space-y-1 max-h-80 overflow-y-auto">
              {result.items.map((ing) => (
                <div
                  key={ing.id}
                  className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg border border-gray-100 hover:border-gray-200 hover:bg-gray-50"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-gray-800 truncate">{ing.name}</div>
                    <div className="text-xs text-gray-400">
                      {ing.category && <span className="mr-2">{ing.category}</span>}
                      Recipe unit: {INGREDIENT_UNIT_LABELS[ing.unit as IngredientUnit] ?? ing.unit}
                    </div>
                  </div>
                  <div className="shrink-0">
                    {registeredIds.has(ing.id) ? (
                      <span className="text-xs font-medium text-green-600">✓ Registered</span>
                    ) : registering === ing.id ? (
                      <span className="text-xs text-brand-600">Registering…</span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleRegister(ing)}
                        className="text-xs font-medium text-brand-600 hover:text-brand-800 px-2 py-1 rounded hover:bg-brand-50 transition"
                      >
                        + Add to My Tenant
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
