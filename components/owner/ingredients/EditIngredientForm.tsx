"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Ingredient, UpdateIngredientInput, IngredientUnit } from "@/types/owner-ingredients";
import { INGREDIENT_UNIT_LABELS, getUnitConversionFactor } from "@/types/owner-ingredients";

const UNITS = Object.keys(INGREDIENT_UNIT_LABELS) as IngredientUnit[];
const GST_RATE = 0.1;

interface Props {
  ingredient: Ingredient;
}

export default function EditIngredientForm({ ingredient }: Props) {
  const router = useRouter();
  const [name, setName] = useState(ingredient.name);
  const [purchaseUnit, setPurchaseUnit] = useState<IngredientUnit>(ingredient.purchaseUnit);
  const [recipeUnit, setRecipeUnit] = useState<IngredientUnit>(ingredient.unit);
  const [notes, setNotes] = useState(ingredient.notes ?? "");
  const [isActive, setIsActive] = useState(ingredient.isActive);
  const [manualConversion, setManualConversion] = useState("");

  // unitCost is stored in millicents (1/100000 dollar). Allow user to edit as total qty + price.
  // Pre-fill total qty = 1 and total price = unit cost (dollars), so existing cost is preserved.
  const [totalQtyStr, setTotalQtyStr] = useState("1");
  const [gstIncluded, setGstIncluded] = useState(false);

  const autoConversion = getUnitConversionFactor(purchaseUnit, recipeUnit);
  const conversionFactor =
    autoConversion !== undefined
      ? autoConversion
      : parseFloat(manualConversion) || null;

  const needsManualConversion =
    autoConversion === undefined && purchaseUnit !== recipeUnit;

  // Pre-fill total price from stored unitCost (millicents → dollars).
  // With totalQty=1 purchaseUnit, price = unitCost/100000 * conversionFactor (dollars per purchaseUnit).
  // When purchaseUnit and unit are incompatible (no auto-conversion), we cannot derive a meaningful
  // total price without the original manual conversion factor, so we leave the field empty and let
  // the user re-enter their purchase details.
  const initConversion = getUnitConversionFactor(ingredient.purchaseUnit, ingredient.unit);
  const [totalPriceStr, setTotalPriceStr] = useState(
    initConversion !== undefined
      ? ((ingredient.unitCost / 100000) * initConversion).toFixed(6)
      : ""
  );

  const totalQty = parseFloat(totalQtyStr);
  const totalPrice = parseFloat(totalPriceStr);
  const exGstPrice = gstIncluded ? totalPrice / (1 + GST_RATE) : totalPrice;
  // unitCost = cost per 1 recipeUnit (in millicents)
  // totalQty purchaseUnits × conversionFactor = total recipeUnits
  const computedUnitCost =
    totalQty > 0 && totalPrice > 0 && conversionFactor !== null && conversionFactor > 0
      ? Math.round((exGstPrice / (totalQty * conversionFactor)) * 100000)
      : null;

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
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
      setError("Purchase unit and recipe unit are incompatible. Please enter a conversion factor.");
      return;
    }
    if (computedUnitCost === null || computedUnitCost <= 0) {
      setError("Unable to compute unit cost. Please check your inputs.");
      return;
    }
    setSubmitting(true);
    try {
      const body: UpdateIngredientInput = {
        name,
        purchaseUnit,
        unit: recipeUnit,
        unitCost: computedUnitCost,
        isActive,
        notes: notes || undefined,
      };
      const res = await fetch(`/api/owner/ingredients/${ingredient.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Failed to update ingredient");
        return;
      }
      router.push("/owner/ingredients");
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Are you sure you want to delete this ingredient?")) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/owner/ingredients/${ingredient.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Failed to delete ingredient");
        return;
      }
      router.push("/owner/ingredients");
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white rounded-xl border border-gray-200 p-5 space-y-4"
    >
      {/* Row 1: name */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">
          Name <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Bread flour"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>

      {/* Row 2: purchase unit + qty + total price */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Purchase Unit <span className="text-red-500">*</span>
          </label>
          <select
            required
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
            required
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
            required
            value={totalPriceStr}
            onChange={(e) => setTotalPriceStr(e.target.value)}
            placeholder="35.00"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
      </div>

      {/* Row 3: recipe unit + gst + manual conversion (if needed) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Recipe Unit <span className="text-red-500">*</span>
          </label>
          <select
            required
            value={recipeUnit}
            onChange={(e) => setRecipeUnit(e.target.value as IngredientUnit)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            {UNITS.map((u) => (
              <option key={u} value={u}>
                {INGREDIENT_UNIT_LABELS[u]} ({u})
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2 pb-0.5">
          <input
            type="checkbox"
            id="edit-ingredient-gst"
            checked={gstIncluded}
            onChange={(e) => setGstIncluded(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
          />
          <label htmlFor="edit-ingredient-gst" className="text-xs text-gray-600 select-none">
            Price includes GST
          </label>
        </div>
        <div className="sm:col-span-2">
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
          {!needsManualConversion && autoConversion !== undefined && autoConversion !== 1 && (
            <div className="text-xs text-gray-400 pb-0.5">
              1 {INGREDIENT_UNIT_LABELS[purchaseUnit]} = {autoConversion}{" "}
              {INGREDIENT_UNIT_LABELS[recipeUnit]}
            </div>
          )}
        </div>
      </div>

      {/* Row 4: current stored unit cost (shown when manual conversion is required) */}
      {needsManualConversion && (
        <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-800">
          Current stored cost:{" "}
          <span className="font-medium">
            ${(ingredient.unitCost / 100000).toFixed(6)} / {INGREDIENT_UNIT_LABELS[ingredient.unit]}
          </span>
          . Enter your purchase details above to set a new cost.
        </div>
      )}

      {/* Row 5: computed unit cost */}
      <div className="sm:w-2/3">
        <div className="text-xs font-medium text-gray-500 mb-1">
          Computed Unit Cost (per {INGREDIENT_UNIT_LABELS[recipeUnit]}, ex-GST)
        </div>
        <div className="rounded-lg bg-gray-50 border border-gray-200 px-3 py-2 text-sm text-gray-700">
          {computedUnitCost !== null
            ? `$${(computedUnitCost / 100000).toFixed(6)} / ${INGREDIENT_UNIT_LABELS[recipeUnit]}`
            : "—"}
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Notes (optional)</label>
        <input
          type="text"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="e.g. Premium bread flour"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="edit-ingredient-active"
          checked={isActive}
          onChange={(e) => setIsActive(e.target.checked)}
          className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
        />
        <label htmlFor="edit-ingredient-active" className="text-xs text-gray-600 select-none">
          Active
        </label>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={submitting}
          className="px-5 py-2 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 disabled:opacity-50 transition"
        >
          {submitting ? "Saving…" : "Save Changes"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/owner/ingredients")}
          className="px-5 py-2 bg-white border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleDelete}
          disabled={deleting}
          className="ml-auto px-5 py-2 bg-red-50 text-red-600 border border-red-200 text-sm font-medium rounded-lg hover:bg-red-100 disabled:opacity-50 transition"
        >
          {deleting ? "Deleting…" : "Delete"}
        </button>
      </div>
    </form>
  );
}
