"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { TenantProductCategoryRow } from "@/types/owner";

interface Props {
  initialCategories: TenantProductCategoryRow[];
}

export default function ProductCategoryManagerPage({ initialCategories }: Props) {
  const router = useRouter();
  const [categories, setCategories] = useState<TenantProductCategoryRow[]>(initialCategories);
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
      const res = await fetch("/api/owner/tenant-product-categories", {
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

  function startEdit(cat: TenantProductCategoryRow) {
    setEditingId(cat.id);
    setEditName(cat.name);
    setError(null);
  }

  async function handleSaveEdit(categoryId: string) {
    if (!editName.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/owner/tenant-product-categories/${categoryId}`, {
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

  async function handleDelete(categoryId: string, categoryName: string) {
    if (
      !confirm(
        `Delete category "${categoryName}"? Products in this category will become uncategorized.`
      )
    )
      return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/owner/tenant-product-categories/${categoryId}`, {
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
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {error && (
        <div className="px-4 py-3 bg-red-50 border-b border-red-200">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Category list */}
      {categories.length === 0 ? (
        <div className="px-4 py-10 text-center text-gray-400 text-sm">
          No product categories yet. Add the first one below.
        </div>
      ) : (
        <table className="min-w-full divide-y divide-gray-100 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">
                Category Name
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {categories.map((cat) => (
              <tr key={cat.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  {editingId === cat.id ? (
                    <input
                      className="w-full max-w-xs rounded border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
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
                <td className="px-4 py-3 text-right whitespace-nowrap">
                  {editingId === cat.id ? (
                    <>
                      <button
                        onClick={() => handleSaveEdit(cat.id)}
                        disabled={loading}
                        className="text-xs px-3 py-1 bg-brand-600 text-white rounded hover:bg-brand-700 disabled:opacity-50 mr-2 transition-colors"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="text-xs px-3 py-1 border border-gray-200 rounded text-gray-500 hover:bg-gray-50 transition-colors"
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => startEdit(cat)}
                        className="text-xs text-brand-600 hover:text-brand-800 font-medium mr-4"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(cat.id, cat.name)}
                        disabled={loading}
                        className="text-xs text-red-500 hover:text-red-700 font-medium disabled:opacity-50"
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
            className="flex-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          <button
            type="submit"
            disabled={loading || !newName.trim()}
            className="px-3 py-1.5 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 disabled:opacity-50 transition-colors"
          >
            + Add
          </button>
        </form>
      </div>
    </div>
  );
}
