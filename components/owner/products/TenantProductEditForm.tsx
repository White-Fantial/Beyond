"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { TenantProductRow, TenantProductCategoryRow } from "@/types/owner";

interface Props {
  product: TenantProductRow;
}

function formatPrice(amount: number, currency: string) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount / 100);
}

export default function TenantProductEditForm({ product }: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<TenantProductCategoryRow[]>([]);

  const [form, setForm] = useState({
    name: product.name,
    shortDescription: product.shortDescription ?? "",
    description: product.description ?? "",
    basePriceAmount: (product.basePriceAmount / 100).toFixed(2),
    currency: product.currency,
    internalNote: product.internalNote ?? "",
    isActive: product.isActive,
    categoryId: product.categoryId ?? "",
  });

  useEffect(() => {
    fetch("/api/owner/tenant-product-categories")
      .then((r) => r.json())
      .then((json) => {
        if (json.data) setCategories(json.data);
      })
      .catch(() => {});
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/owner/tenant-products/${product.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          shortDescription: form.shortDescription.trim() || null,
          description: form.description.trim() || null,
          basePriceAmount: Math.round(parseFloat(form.basePriceAmount) * 100),
          currency: form.currency,
          internalNote: form.internalNote.trim() || null,
          isActive: form.isActive,
          categoryId: form.categoryId || null,
        }),
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error ?? "Failed to save");
      }
      router.refresh();
      setEditing(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm(`Delete product "${product.name}"? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/owner/tenant-products/${product.id}`, { method: "DELETE" });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error ?? "Failed to delete");
      }
      router.push("/owner/products");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
      setDeleting(false);
    }
  }

  if (!editing) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900">{product.name}</h1>
            {product.shortDescription && (
              <p className="text-sm text-gray-500 mt-1">{product.shortDescription}</p>
            )}
            {product.categoryName && (
              <span className="inline-block mt-2 text-xs font-medium px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">
                {product.categoryName}
              </span>
            )}
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-gray-900">
              {formatPrice(product.basePriceAmount, product.currency)}
            </div>
            <span
              className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                product.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-400"
              }`}
            >
              {product.isActive ? "Active" : "Inactive"}
            </span>
          </div>
        </div>

        {product.description && (
          <p className="text-sm text-gray-600 mb-4">{product.description}</p>
        )}

        <div className="flex items-center gap-2 text-xs text-gray-500 pt-4 border-t border-gray-100">
          <span className="font-medium">
            {product.selectionCount} {product.selectionCount === 1 ? "store" : "stores"} selling this product
          </span>
        </div>

        {product.internalNote && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
              Internal Note
            </div>
            <p className="text-sm text-gray-600">{product.internalNote}</p>
          </div>
        )}

        <div className="flex items-center gap-3 mt-5 pt-4 border-t border-gray-100">
          <button
            onClick={() => setEditing(true)}
            className="px-4 py-2 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 transition-colors"
          >
            Edit Product
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="px-4 py-2 border border-red-200 text-red-600 text-sm font-medium rounded-lg hover:bg-red-50 disabled:opacity-50 transition-colors"
          >
            {deleting ? "Deleting..." : "Delete"}
          </button>
        </div>

        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h2 className="text-lg font-bold text-gray-900 mb-4">Edit Product</h2>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Product Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-brand-400"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
          <select
            value={form.categoryId}
            onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-brand-400"
          >
            <option value="">— No category —</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Short Description</label>
          <input
            type="text"
            value={form.shortDescription}
            onChange={(e) => setForm((f) => ({ ...f, shortDescription: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-brand-400"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            rows={3}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-brand-400 resize-none"
          />
        </div>

        <div className="flex gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">Base Price ($)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.basePriceAmount}
              onChange={(e) => setForm((f) => ({ ...f, basePriceAmount: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-brand-400"
            />
          </div>
          <div className="w-28">
            <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
            <select
              value={form.currency}
              onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-brand-400"
            >
              <option value="USD">USD</option>
              <option value="NZD">NZD</option>
              <option value="AUD">AUD</option>
              <option value="GBP">GBP</option>
              <option value="EUR">EUR</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Internal Note</label>
          <input
            type="text"
            value={form.internalNote}
            onChange={(e) => setForm((f) => ({ ...f, internalNote: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-brand-400"
          />
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="isActive"
            checked={form.isActive}
            onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
            className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
          />
          <label htmlFor="isActive" className="text-sm text-gray-700 select-none">
            Active
          </label>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 disabled:opacity-50 transition-colors"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
          <button
            type="button"
            onClick={() => { setEditing(false); setError(null); }}
            className="px-5 py-2 border border-gray-200 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
