"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { RecipeYieldUnit } from "@/types/owner-recipes";
import { RECIPE_YIELD_UNIT_LABELS } from "@/types/owner-recipes";

const YIELD_UNITS = Object.keys(RECIPE_YIELD_UNIT_LABELS) as RecipeYieldUnit[];

interface RecipeRow {
  id: string;
  name: string;
  storeId: string | null;
  storeName: string | null;
  yieldQty: number;
  yieldUnit: string;
  notes?: string | null;
  createdAt: string;
}

interface Props {
  recipe: RecipeRow;
}

/**
 * Renders a full <tr> for one admin recipe row.
 * In "idle" mode: shows recipe data with Edit / Delete buttons.
 * In "edit" mode: shows an inline edit form spanning all columns.
 * In "confirmDelete" mode: shows a delete confirmation row.
 */
export default function AdminRecipeActions({ recipe }: Props) {
  const router = useRouter();
  const [mode, setMode] = useState<"idle" | "edit" | "confirmDelete">("idle");
  const [name, setName] = useState(recipe.name);
  const [yieldQty, setYieldQty] = useState(String(recipe.yieldQty));
  const [yieldUnit, setYieldUnit] = useState<RecipeYieldUnit>(
    recipe.yieldUnit as RecipeYieldUnit
  );
  const [notes, setNotes] = useState(recipe.notes ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function resetForm() {
    setName(recipe.name);
    setYieldQty(String(recipe.yieldQty));
    setYieldUnit(recipe.yieldUnit as RecipeYieldUnit);
    setNotes(recipe.notes ?? "");
    setError(null);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const qty = parseInt(yieldQty, 10);
    if (!name.trim()) {
      setError("Recipe name is required.");
      return;
    }
    if (!qty || qty < 1) {
      setError("Yield quantity must be at least 1.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/recipes/${recipe.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          yieldQty: qty,
          yieldUnit,
          notes: notes.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Failed to update recipe.");
        return;
      }
      setMode("idle");
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/recipes/${recipe.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Failed to delete recipe.");
        setMode("idle");
        return;
      }
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
      setMode("idle");
    } finally {
      setSubmitting(false);
    }
  }

  if (mode === "edit") {
    return (
      <tr>
        <td colSpan={5} className="px-4 py-4 bg-blue-50">
          <form onSubmit={handleSave} className="flex flex-wrap items-end gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="rounded border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-48"
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
                className="rounded border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-20"
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
                className="rounded border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {YIELD_UNITS.map((u) => (
                  <option key={u} value={u}>
                    {RECIPE_YIELD_UNIT_LABELS[u]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Notes
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="rounded border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-40"
              />
            </div>
            {error && (
              <p className="w-full text-xs text-red-600">{error}</p>
            )}
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={submitting}
                className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-50 transition"
              >
                {submitting ? "Saving…" : "Save"}
              </button>
              <button
                type="button"
                onClick={() => { setMode("idle"); resetForm(); }}
                className="px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-300 rounded hover:bg-gray-50 transition"
              >
                Cancel
              </button>
            </div>
          </form>
        </td>
      </tr>
    );
  }

  if (mode === "confirmDelete") {
    return (
      <tr>
        <td colSpan={5} className="px-4 py-3 bg-red-50">
          <div className="flex items-center gap-3">
            <span className="text-sm text-red-700">
              Delete &ldquo;{recipe.name}&rdquo;? This cannot be undone.
            </span>
            {error && <span className="text-xs text-red-600">{error}</span>}
            <button
              onClick={handleDelete}
              disabled={submitting}
              className="px-3 py-1.5 text-xs font-medium text-white bg-red-600 rounded hover:bg-red-700 disabled:opacity-50 transition"
            >
              {submitting ? "Deleting…" : "Delete"}
            </button>
            <button
              onClick={() => { setMode("idle"); setError(null); }}
              className="px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-300 rounded hover:bg-gray-50 transition"
            >
              Cancel
            </button>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <tr className="hover:bg-gray-50">
      <td className="px-4 py-3 font-medium text-gray-900">{recipe.name}</td>
      <td className="px-4 py-3 text-gray-500 hidden sm:table-cell">
        {recipe.storeName ?? recipe.storeId}
      </td>
      <td className="px-4 py-3 text-gray-600 hidden md:table-cell">
        {recipe.yieldQty}{" "}
        {RECIPE_YIELD_UNIT_LABELS[recipe.yieldUnit as RecipeYieldUnit] ?? recipe.yieldUnit}
      </td>
      <td className="px-4 py-3 text-gray-400 text-xs hidden lg:table-cell">
        {new Date(recipe.createdAt).toLocaleDateString("en-US")}
      </td>
      <td className="px-4 py-3 text-right whitespace-nowrap">
        <button
          onClick={() => setMode("edit")}
          className="text-xs text-blue-600 hover:underline mr-3"
        >
          Edit
        </button>
        <button
          onClick={() => setMode("confirmDelete")}
          className="text-xs text-red-600 hover:underline"
        >
          Delete
        </button>
      </td>
    </tr>
  );
}
