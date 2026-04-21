"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { RecipeCategoryRow } from "@/services/admin/admin-recipe-categories.service";

interface Props {
  initialCategories: RecipeCategoryRow[];
}

export default function RecipeCategoryManager({ initialCategories }: Props) {
  const router = useRouter();
  const [categories, setCategories] = useState<RecipeCategoryRow[]>(initialCategories);
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/recipe-categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim() }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to create category");
      setCategories((prev) => [...prev, json.data]);
      setNewName("");
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  function startEdit(cat: RecipeCategoryRow) {
    setEditingId(cat.id);
    setEditName(cat.name);
    setError(null);
  }

  async function handleSaveEdit(categoryId: string) {
    if (!editName.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/recipe-categories/${categoryId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName.trim() }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to update category");
      setCategories((prev) => prev.map((c) => (c.id === categoryId ? json.data : c)));
      setEditingId(null);
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(categoryId: string, categoryName: string, recipeCount: number) {
    const warning =
      recipeCount > 0
        ? `Delete category "${categoryName}"? ${recipeCount} recipe(s) will become uncategorized.`
        : `Delete category "${categoryName}"?`;
    if (!confirm(warning)) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/recipe-categories/${categoryId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error ?? "Failed to delete category");
      }
      setCategories((prev) => prev.filter((c) => c.id !== categoryId));
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {error && (
        <div className="px-4 py-3 bg-red-50 border-b border-red-200">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Category list */}
      {categories.length === 0 ? (
        <div className="px-4 py-8 text-center text-gray-400 text-sm">
          No recipe categories yet. Add the first one below.
        </div>
      ) : (
        <table className="min-w-full divide-y divide-gray-100 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Category Name</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500 hidden sm:table-cell">
                Recipes
              </th>
              <th className="px-4 py-3 text-right font-medium text-gray-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {categories.map((cat) => (
              <tr key={cat.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  {editingId === cat.id ? (
                    <input
                      className="w-full max-w-xs rounded border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleSaveEdit(cat.id);
                        if (e.key === "Escape") setEditingId(null);
                      }}
                      autoFocus
                    />
                  ) : (
                    <span className="font-medium text-gray-900">{cat.name}</span>
                  )}
                </td>
                <td className="px-4 py-3 text-gray-500 hidden sm:table-cell">
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      cat.recipeCount > 0
                        ? "bg-blue-100 text-blue-700"
                        : "bg-gray-100 text-gray-400"
                    }`}
                  >
                    {cat.recipeCount} {cat.recipeCount === 1 ? "recipe" : "recipes"}
                  </span>
                </td>
                <td className="px-4 py-3 text-right whitespace-nowrap">
                  {editingId === cat.id ? (
                    <>
                      <button
                        onClick={() => handleSaveEdit(cat.id)}
                        disabled={loading}
                        className="text-xs text-white bg-red-700 hover:bg-red-800 px-3 py-1 rounded disabled:opacity-50 mr-2 transition"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="text-xs text-gray-600 border border-gray-300 hover:bg-gray-50 px-3 py-1 rounded transition"
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => startEdit(cat)}
                        className="text-xs text-blue-600 hover:underline mr-4"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(cat.id, cat.name, cat.recipeCount)}
                        disabled={loading}
                        className="text-xs text-red-600 hover:underline disabled:opacity-50"
                      >
                        Delete
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Add new category form */}
      <div className="px-4 py-4 border-t border-gray-100 bg-gray-50">
        <form onSubmit={handleAdd} className="flex gap-2">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="New category name"
            className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
          />
          <button
            type="submit"
            disabled={loading || !newName.trim()}
            className="px-4 py-2 bg-red-700 text-white text-sm font-medium rounded-lg hover:bg-red-800 disabled:opacity-50 transition"
          >
            + Add
          </button>
        </form>
      </div>
    </div>
  );
}
