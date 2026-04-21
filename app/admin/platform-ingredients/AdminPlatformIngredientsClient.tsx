"use client";

import { useState } from "react";
import type { Ingredient, IngredientUnit } from "@/types/owner-ingredients";
import { INGREDIENT_UNIT_LABELS, getUnitConversionFactor } from "@/types/owner-ingredients";

interface Props {
  initialItems: Ingredient[];
}

const UNITS = Object.keys(INGREDIENT_UNIT_LABELS) as IngredientUnit[];

const EMPTY_FORM = {
  name: "",
  category: "",
  description: "",
  purchaseUnit: "KG" as IngredientUnit,
  purchaseQty: "1",
  unit: "GRAM" as IngredientUnit,
  purchasePrice: "",
  currency: "USD",
};

/**
 * Calculates unitCost in millicents from purchase price (dollars), purchase
 * quantity, and the unit conversion between purchaseUnit and recipe unit.
 * Returns null when inputs are invalid or units are incompatible.
 */
function calcUnitCostMillicents(
  purchasePrice: string,
  purchaseQty: string,
  purchaseUnit: IngredientUnit,
  unit: IngredientUnit
): number | null {
  const price = parseFloat(purchasePrice);
  const qty = parseFloat(purchaseQty);
  if (!isFinite(price) || !isFinite(qty) || qty <= 0 || price < 0) return null;
  const factor = getUnitConversionFactor(purchaseUnit, unit);
  if (factor === undefined) return null;
  const totalRecipeUnits = qty * factor;
  return Math.round((price / totalRecipeUnits) * 100000);
}

/**
 * Derives the purchase price (dollars) from stored unitCost + purchaseQty.
 * Returns empty string when units are incompatible.
 */
function derivePurchasePrice(
  unitCostMillicents: number,
  purchaseQty: number,
  purchaseUnit: IngredientUnit,
  unit: IngredientUnit
): string {
  const factor = getUnitConversionFactor(purchaseUnit, unit);
  if (factor === undefined) return "";
  const totalRecipeUnits = purchaseQty * factor;
  return ((unitCostMillicents / 100000) * totalRecipeUnits).toFixed(2);
}

export default function AdminPlatformIngredientsClient({ initialItems }: Props) {
  const [items, setItems] = useState<Ingredient[]>(initialItems);
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editForm, setEditForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Derive unique categories from existing items for datalist suggestions
  const categoryOptions = Array.from(
    new Set(items.map((i) => i.category).filter((c): c is string => !!c))
  ).sort();

  // Computed unitCost previews for the add / edit forms
  const addUnitCost = calcUnitCostMillicents(
    form.purchasePrice,
    form.purchaseQty,
    form.purchaseUnit,
    form.unit
  );
  const editUnitCost = calcUnitCostMillicents(
    editForm.purchasePrice,
    editForm.purchaseQty,
    editForm.purchaseUnit,
    editForm.unit
  );

  function startEdit(ing: Ingredient) {
    setEditingId(ing.id);
    setEditForm({
      name: ing.name,
      category: ing.category ?? "",
      description: ing.description ?? "",
      purchaseUnit: ing.purchaseUnit,
      purchaseQty: String(ing.purchaseQty),
      unit: ing.unit,
      purchasePrice: derivePurchasePrice(ing.unitCost, ing.purchaseQty, ing.purchaseUnit, ing.unit),
      currency: ing.currency,
    });
    setError(null);
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    const unitCost = calcUnitCostMillicents(form.purchasePrice, form.purchaseQty, form.purchaseUnit, form.unit);
    if (unitCost === null) {
      setError("Cannot calculate unit cost — check purchase quantity, price, and unit compatibility.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/platform-ingredients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          category: form.category.trim() || null,
          description: form.description.trim() || null,
          purchaseUnit: form.purchaseUnit,
          purchaseQty: parseFloat(form.purchaseQty),
          unit: form.unit,
          unitCost,
          currency: form.currency,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to create ingredient");
      setItems((prev) => [...prev, json.data]);
      setForm(EMPTY_FORM);
      setShowAdd(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveEdit(id: string) {
    const unitCost = calcUnitCostMillicents(editForm.purchasePrice, editForm.purchaseQty, editForm.purchaseUnit, editForm.unit);
    if (unitCost === null) {
      setError("Cannot calculate unit cost — check purchase quantity, price, and unit compatibility.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/platform-ingredients/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editForm.name.trim(),
          category: editForm.category.trim() || null,
          description: editForm.description.trim() || null,
          purchaseUnit: editForm.purchaseUnit,
          purchaseQty: parseFloat(editForm.purchaseQty),
          unit: editForm.unit,
          unitCost,
          currency: editForm.currency,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to update ingredient");
      setItems((prev) => prev.map((i) => (i.id === id ? json.data : i)));
      setEditingId(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete platform ingredient "${name}"? This cannot be undone.`)) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/platform-ingredients/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error ?? "Failed to delete ingredient");
      }
      setItems((prev) => prev.filter((i) => i.id !== id));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <datalist id="category-suggestions">
        {categoryOptions.map((c) => (
          <option key={c} value={c} />
        ))}
      </datalist>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Platform Ingredient Catalog</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Shared ingredients used by marketplace recipes. Total: {items.length}
          </p>
        </div>
        <button
          onClick={() => { setShowAdd((v) => !v); setError(null); }}
          className="px-4 py-2 bg-white border border-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
        >
          {showAdd ? "Cancel" : "+ Add Ingredient"}
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      {showAdd && (
        <form
          onSubmit={handleAdd}
          className="mb-6 bg-white border border-gray-200 rounded-lg p-4 space-y-3"
        >
          <h3 className="text-sm font-semibold text-gray-800">New Platform Ingredient</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Bread Flour"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Category</label>
              <input
                type="text"
                list="category-suggestions"
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                placeholder="e.g. Dairy, Produce, Meat"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Purchase Unit</label>
              <select
                value={form.purchaseUnit}
                onChange={(e) => setForm((f) => ({ ...f, purchaseUnit: e.target.value as IngredientUnit }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {UNITS.map((u) => (
                  <option key={u} value={u}>{INGREDIENT_UNIT_LABELS[u]} ({u})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Purchase Quantity <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                required
                min="0.000001"
                step="any"
                value={form.purchaseQty}
                onChange={(e) => setForm((f) => ({ ...f, purchaseQty: e.target.value }))}
                placeholder="e.g. 20"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Recipe Unit</label>
              <select
                value={form.unit}
                onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value as IngredientUnit }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {UNITS.map((u) => (
                  <option key={u} value={u}>{INGREDIENT_UNIT_LABELS[u]} ({u})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Purchase Price ($) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                required
                min="0"
                step="0.01"
                value={form.purchasePrice}
                onChange={(e) => setForm((f) => ({ ...f, purchasePrice: e.target.value }))}
                placeholder="e.g. 12.50"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Unit Cost (calculated, $/recipe unit)
              </label>
              <div className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-mono text-gray-700">
                {addUnitCost !== null
                  ? `$${(addUnitCost / 100000).toFixed(6)}`
                  : <span className="text-gray-400">—</span>}
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
              <input
                type="text"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Optional description"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={loading || addUnitCost === null}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? "Adding..." : "Add Ingredient"}
            </button>
            <button
              type="button"
              onClick={() => setShowAdd(false)}
              className="px-4 py-2 border border-gray-200 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {items.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <p className="text-4xl mb-3">🥬</p>
          <p className="text-sm">No ingredients registered yet.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Name</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Category</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Purchase Unit</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Purchase Qty</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Purchase Price</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Recipe Unit</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Unit Cost</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Status</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Description</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {items.map((ing) =>
                editingId === ing.id ? (
                  <tr key={ing.id} className="bg-blue-50">
                    <td className="px-3 py-2">
                      <input
                        type="text"
                        value={editForm.name}
                        onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                        className="w-full rounded border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="text"
                        list="category-suggestions"
                        value={editForm.category}
                        onChange={(e) => setEditForm((f) => ({ ...f, category: e.target.value }))}
                        placeholder="Category"
                        className="w-full rounded border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <select
                        value={editForm.purchaseUnit}
                        onChange={(e) => setEditForm((f) => ({ ...f, purchaseUnit: e.target.value as IngredientUnit }))}
                        className="w-full rounded border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                      >
                        {UNITS.map((u) => <option key={u} value={u}>{INGREDIENT_UNIT_LABELS[u]}</option>)}
                      </select>
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        min="0.000001"
                        step="any"
                        value={editForm.purchaseQty}
                        onChange={(e) => setEditForm((f) => ({ ...f, purchaseQty: e.target.value }))}
                        className="w-full rounded border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={editForm.purchasePrice}
                        onChange={(e) => setEditForm((f) => ({ ...f, purchasePrice: e.target.value }))}
                        placeholder="0.00"
                        className="w-full rounded border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <select
                        value={editForm.unit}
                        onChange={(e) => setEditForm((f) => ({ ...f, unit: e.target.value as IngredientUnit }))}
                        className="w-full rounded border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                      >
                        {UNITS.map((u) => <option key={u} value={u}>{INGREDIENT_UNIT_LABELS[u]}</option>)}
                      </select>
                    </td>
                    <td className="px-3 py-2 font-mono text-xs text-gray-600">
                      {editUnitCost !== null
                        ? `$${(editUnitCost / 100000).toFixed(6)}`
                        : <span className="text-gray-400">—</span>}
                    </td>
                    <td className="px-3 py-2 text-gray-400 text-xs">—</td>
                    <td className="px-3 py-2">
                      <input
                        type="text"
                        value={editForm.description}
                        onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
                        className="w-full rounded border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <button
                        onClick={() => handleSaveEdit(ing.id)}
                        disabled={loading || editUnitCost === null}
                        className="text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 mr-1"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="text-xs px-2 py-1 border border-gray-200 rounded text-gray-500 hover:bg-gray-100"
                      >
                        Cancel
                      </button>
                    </td>
                  </tr>
                ) : (
                  <tr key={ing.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{ing.name}</td>
                    <td className="px-4 py-3 text-gray-500">
                      {ing.category ? (
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
                          {ing.category}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {INGREDIENT_UNIT_LABELS[ing.purchaseUnit] ?? ing.purchaseUnit}
                    </td>
                    <td className="px-4 py-3 text-gray-500 font-mono text-xs">
                      {ing.purchaseQty}
                    </td>
                    <td className="px-4 py-3 text-gray-700 font-mono text-xs">
                      {(() => {
                        const pp = derivePurchasePrice(ing.unitCost, ing.purchaseQty, ing.purchaseUnit, ing.unit);
                        return pp ? `$${pp}` : "—";
                      })()}
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {INGREDIENT_UNIT_LABELS[ing.unit] ?? ing.unit}
                    </td>
                    <td className="px-4 py-3 text-gray-700 font-mono text-xs">
                      ${(ing.unitCost / 100000).toFixed(6)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                          ing.isActive
                            ? "bg-green-100 text-green-700"
                            : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        {ing.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs max-w-xs truncate">
                      {ing.description ?? "—"}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right">
                      <button
                        onClick={() => startEdit(ing)}
                        className="text-xs text-blue-600 hover:text-blue-800 font-medium mr-3"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(ing.id, ing.name)}
                        disabled={loading}
                        className="text-xs text-red-500 hover:text-red-700 font-medium disabled:opacity-50"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
