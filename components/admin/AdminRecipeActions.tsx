"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { RecipeYieldUnit } from "@/types/owner-recipes";
import { RECIPE_YIELD_UNIT_LABELS } from "@/types/owner-recipes";

interface RecipeRow {
  id: string;
  name: string;
  storeId: string | null;
  storeName: string | null;
  categoryId: string | null;
  categoryName: string | null;
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
 * In "confirmDelete" mode: shows a delete confirmation row.
 * Edit navigates to the dedicated edit page.
 */
export default function AdminRecipeActions({ recipe }: Props) {
  const router = useRouter();
  const [mode, setMode] = useState<"idle" | "confirmDelete">("idle");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  if (mode === "confirmDelete") {
    return (
      <tr>
        <td colSpan={6} className="px-4 py-3 bg-red-50">
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
      <td className="px-4 py-3 hidden sm:table-cell">
        {recipe.categoryName ? (
          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">
            {recipe.categoryName}
          </span>
        ) : (
          <span className="text-gray-300 text-xs">—</span>
        )}
      </td>
      <td className="px-4 py-3 text-gray-500 hidden md:table-cell">
        {recipe.storeName ?? recipe.storeId ?? <span className="text-gray-300">Platform</span>}
      </td>
      <td className="px-4 py-3 text-gray-600 hidden md:table-cell">
        {recipe.yieldQty}{" "}
        {RECIPE_YIELD_UNIT_LABELS[recipe.yieldUnit as RecipeYieldUnit] ?? recipe.yieldUnit}
      </td>
      <td className="px-4 py-3 text-gray-400 text-xs hidden lg:table-cell">
        {new Date(recipe.createdAt).toLocaleDateString("en-US")}
      </td>
      <td className="px-4 py-3 text-right whitespace-nowrap">
        <Link
          href={`/admin/recipes/${recipe.id}/edit`}
          className="text-xs text-blue-600 hover:underline mr-3"
        >
          Edit
        </Link>
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
