"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Ingredient, IngredientUnit } from "@/types/owner-ingredients";
import { INGREDIENT_UNIT_LABELS, getUnitConversionFactor } from "@/types/owner-ingredients";

interface Props {
  storeId: string;
}

interface SearchResult {
  items: Ingredient[];
  total: number;
}

const GST_RATE = 0.1;
const UNITS = Object.keys(INGREDIENT_UNIT_LABELS) as IngredientUnit[];

function PriceForm({
  ingredient,
  storeId,
  onImported,
  onCancel,
}: {
  ingredient: Ingredient;
  storeId: string;
  onImported: () => void;
  onCancel: () => void;
}) {
  const [totalQtyStr, setTotalQtyStr] = useState("");
  const [totalPriceStr, setTotalPriceStr] = useState("");
  const [gstIncluded, setGstIncluded] = useState(false);
  const [manualConversion, setManualConversion] = useState("");
  const [purchaseUnit, setPurchaseUnit] = useState<IngredientUnit>(ingredient.purchaseUnit);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const recipeUnit = ingredient.unit;
  const totalQty = parseFloat(totalQtyStr);
  const totalPrice = parseFloat(totalPriceStr);
  const exGstPrice = gstIncluded ? totalPrice / (1 + GST_RATE) : totalPrice;

  const autoConversion = getUnitConversionFactor(purchaseUnit, recipeUnit);
  const conversionFactor =
    autoConversion !== undefined ? autoConversion : parseFloat(manualConversion) || null;

  const needsManualConversion = autoConversion === undefined && purchaseUnit !== recipeUnit;

  const computedUnitCost =
    totalQty > 0 && totalPrice > 0 && conversionFactor !== null && conversionFactor > 0
      ? Math.round((exGstPrice / (totalQty * conversionFactor)) * 100000)
      : null;

  async function handleImport() {
    setError(null);
    if (!totalQty || totalQty <= 0) {
      setError("Please enter a valid total quantity.");
      return;
    }
    if (!totalPrice || totalPrice <= 0) {
      setError("Please enter a valid total price.");
      return;
    }
    if (needsManualConversion && (!conversionFactor || conversionFactor <= 0)) {
      setError("Units are incompatible — please enter a conversion factor.");
      return;
    }
    if (computedUnitCost === null || computedUnitCost <= 0) {
      setError("Unable to compute unit cost. Please check your inputs.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/owner/platform-ingredients/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platformIngredientId: ingredient.id,
          storeId,
          unitCost: computedUnitCost,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Import failed");
        return;
      }
      onImported();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mt-3 rounded-lg border border-brand-200 bg-brand-50 p-4 space-y-3">
      <p className="text-xs font-semibold text-brand-800">
        Set your price for <span className="font-bold">{ingredient.name}</span>
      </p>
      <p className="text-xs text-brand-600">
        Enter how much you pay so the unit cost can be calculated for your store.
        Each store can have a different price for the same ingredient.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Purchase Unit
          </label>
          <select
            value={purchaseUnit}
            onChange={(e) => setPurchaseUnit(e.target.value as IngredientUnit)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            {UNITS.map((u) => (
              <option key={u} value={u}>
                {INGREDIENT_UNIT_LABELS[u]} ({u})
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Purchase Qty ({INGREDIENT_UNIT_LABELS[purchaseUnit]}) <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            min="0"
            step="any"
            value={totalQtyStr}
            onChange={(e) => setTotalQtyStr(e.target.value)}
            placeholder="2"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Total Purchase Price ($) <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={totalPriceStr}
            onChange={(e) => setTotalPriceStr(e.target.value)}
            placeholder="35.00"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="import-gst"
          checked={gstIncluded}
          onChange={(e) => setGstIncluded(e.target.checked)}
          className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
        />
        <label htmlFor="import-gst" className="text-xs text-gray-600 select-none">
          Price includes GST
        </label>
      </div>

      {needsManualConversion && (
        <div>
          <label className="block text-xs font-medium text-amber-700 mb-1">
            Conversion factor (1 {INGREDIENT_UNIT_LABELS[purchaseUnit]} = ?{" "}
            {INGREDIENT_UNIT_LABELS[recipeUnit]}) <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            min="0"
            step="any"
            value={manualConversion}
            onChange={(e) => setManualConversion(e.target.value)}
            placeholder="e.g. 300 for 300g per ea"
            className="w-full rounded-lg border border-amber-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
        </div>
      )}

      <div className="text-xs text-gray-500">
        Computed unit cost:{" "}
        <span className="font-medium text-gray-800">
          {computedUnitCost !== null
            ? `$${(computedUnitCost / 100000).toFixed(6)} / ${INGREDIENT_UNIT_LABELS[recipeUnit]}`
            : "—"}
        </span>
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleImport}
          disabled={submitting}
          className="px-4 py-1.5 bg-brand-600 text-white text-xs font-medium rounded-lg hover:bg-brand-700 disabled:opacity-50 transition"
        >
          {submitting ? "Importing…" : "Import to My Ingredients"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-1.5 bg-white border border-gray-300 text-gray-600 text-xs font-medium rounded-lg hover:bg-gray-50 transition"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

export default function ImportPlatformIngredientPanel({ storeId }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<SearchResult | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [selectedIngredient, setSelectedIngredient] = useState<Ingredient | null>(null);
  const [importedId, setImportedId] = useState<string | null>(null);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setSearchError(null);
    setSelectedIngredient(null);
    setImportedId(null);

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

  function handleImported() {
    if (selectedIngredient) setImportedId(selectedIngredient.id);
    setSelectedIngredient(null);
    router.refresh();
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
          onClick={() => { setOpen(false); setResult(null); setSelectedIngredient(null); }}
          className="text-xs text-gray-400 hover:text-gray-600"
        >
          ✕ Close
        </button>
      </div>
      <p className="text-xs text-gray-500">
        Search the platform ingredient catalogue and import an ingredient with your own price.
        Each store sets its own unit cost — the same ingredient can have different prices per store.
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

      {searchError && (
        <p className="text-sm text-red-600">{searchError}</p>
      )}

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
                <div key={ing.id}>
                  <div className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg border border-gray-100 hover:border-gray-200 hover:bg-gray-50">
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-gray-800 truncate">{ing.name}</div>
                      <div className="text-xs text-gray-400">
                        {ing.category && <span className="mr-2">{ing.category}</span>}
                        {INGREDIENT_UNIT_LABELS[ing.purchaseUnit]} → {INGREDIENT_UNIT_LABELS[ing.unit]}
                      </div>
                    </div>
                    <div className="shrink-0">
                      {importedId === ing.id ? (
                        <span className="text-xs font-medium text-green-600">✓ Imported</span>
                      ) : selectedIngredient?.id === ing.id ? (
                        <span className="text-xs text-brand-600 font-medium">Setting price…</span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setSelectedIngredient(ing)}
                          className="text-xs font-medium text-brand-600 hover:text-brand-800 px-2 py-1 rounded hover:bg-brand-50 transition"
                        >
                          Add →
                        </button>
                      )}
                    </div>
                  </div>
                  {selectedIngredient?.id === ing.id && (
                    <PriceForm
                      ingredient={ing}
                      storeId={storeId}
                      onImported={handleImported}
                      onCancel={() => setSelectedIngredient(null)}
                    />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
