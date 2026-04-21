"use client";

import { useState } from "react";
import type { TenantProductCategoryRow } from "@/types/owner";

interface Props {
  initialCategories: TenantProductCategoryRow[];
}

export default function ProductCategoryManager({ initialCategories }: Props) {
  const [open, setOpen] = useState(false);
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
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(categoryId: string, categoryName: string) {
    if (!confirm(`Delete category "${categoryName}"? Products in this category will become uncategorized.`)) return;
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
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        onClick={() => setOpen((v) => !v)}
        className="px-4 py-2 border border-gray-200 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
      >
        {open ? "Hide Categories" : "Manage Categories"}
      </button>

      {open && (
        <div className="mt-3 bg-white rounded-lg border border-gray-200 p-4 space-y-3">
          <h3 className="text-sm font-semibold text-gray-800">Product Categories</h3>

          {error && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
              {error}
            </p>
          )}

          {categories.length === 0 ? (
            <p className="text-xs text-gray-400">No categories yet.</p>
          ) : (
            <ul className="space-y-1">
              {categories.map((cat) => (
                <li key={cat.id} className="flex items-center gap-2">
                  {editingId === cat.id ? (
                    <>
                      <input
                        className="flex-1 rounded border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleSaveEdit(cat.id);
                          if (e.key === "Escape") setEditingId(null);
                        }}
                        autoFocus
                      />
                      <button
                        onClick={() => handleSaveEdit(cat.id)}
                        disabled={loading}
                        className="text-xs px-2 py-1 bg-brand-600 text-white rounded hover:bg-brand-700 disabled:opacity-50"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="text-xs px-2 py-1 border border-gray-200 rounded text-gray-500 hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <span className="flex-1 text-sm text-gray-700">{cat.name}</span>
                      <button
                        onClick={() => startEdit(cat)}
                        className="text-xs text-brand-600 hover:text-brand-800 font-medium"
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
                </li>
              ))}
            </ul>
          )}

          <form onSubmit={handleAdd} className="flex gap-2 pt-1 border-t border-gray-100">
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
      )}
    </div>
  );
}
