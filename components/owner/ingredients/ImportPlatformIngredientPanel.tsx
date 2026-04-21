"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Ingredient, IngredientUnit } from "@/types/owner-ingredients";
import { INGREDIENT_UNIT_LABELS } from "@/types/owner-ingredients";

interface Props {
  storeId: string;
}

interface SearchResult {
  items: Ingredient[];
  total: number;
}

export default function ImportPlatformIngredientPanel({ storeId }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<SearchResult | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [importingId, setImportingId] = useState<string | null>(null);
  const [importedIds, setImportedIds] = useState<Set<string>>(new Set());
  const [importError, setImportError] = useState<string | null>(null);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setSearchError(null);
    setImportError(null);

    startTransition(async () => {
      try {
        const params = new URLSearchParams({ pageSize: "30" });
        if (query.trim()) params.set("q", query.trim());
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

  async function handleImport(ing: Ingredient) {
    setImportError(null);
    setImportingId(ing.id);
    try {
      const res = await fetch("/api/owner/platform-ingredients/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platformIngredientId: ing.id, storeId }),
      });
      if (!res.ok) {
        const data = await res.json();
        setImportError(data.error ?? "Import failed");
        return;
      }
      setImportedIds((prev) => new Set([...prev, ing.id]));
      router.refresh();
    } catch {
      setImportError("Network error. Please try again.");
    } finally {
      setImportingId(null);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 px-4 py-2 bg-white border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition"
      >
        🔍 Import from Platform
      </button>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-900">Import Platform Ingredient</h2>
        <button
          type="button"
          onClick={() => { setOpen(false); setResult(null); setImportedIds(new Set()); }}
          className="text-xs text-gray-400 hover:text-gray-600"
        >
          ✕ Close
        </button>
      </div>
      <p className="text-xs text-gray-500">
        Search the platform ingredient catalogue and import ingredients into your store.
        After importing, link the ingredient to a supplier product to set pricing via
        contract prices or price records.
      </p>

      <form onSubmit={handleSearch} className="flex gap-2">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by ingredient name…"
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
        <button
          type="submit"
          disabled={isPending}
          className="px-4 py-2 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 disabled:opacity-50 transition"
        >
          {isPending ? "Searching…" : "Search"}
        </button>
      </form>

      {searchError && <p className="text-sm text-red-600">{searchError}</p>}
      {importError && <p className="text-sm text-red-600">{importError}</p>}

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
            <div className="space-y-1 max-h-72 overflow-y-auto">
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
                    {importedIds.has(ing.id) ? (
                      <span className="text-xs font-medium text-green-600">✓ Imported</span>
                    ) : importingId === ing.id ? (
                      <span className="text-xs text-brand-600">Importing…</span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleImport(ing)}
                        className="text-xs font-medium text-brand-600 hover:text-brand-800 px-2 py-1 rounded hover:bg-brand-50 transition"
                      >
                        Import →
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
