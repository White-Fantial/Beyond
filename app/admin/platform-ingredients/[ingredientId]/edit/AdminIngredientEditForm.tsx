"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { Ingredient, IngredientUnit } from "@/types/owner-ingredients";
import { INGREDIENT_UNIT_LABELS } from "@/types/owner-ingredients";
import type { PlatformIngredientLink } from "@/services/admin/admin-suppliers.service";

interface SupplierProductResult {
  id: string;
  name: string;
  supplierName: string;
  referencePrice: number;
  unit: string;
}

interface Props {
  ingredient: Ingredient;
  initialLinks: PlatformIngredientLink[];
}

const UNITS = Object.keys(INGREDIENT_UNIT_LABELS) as IngredientUnit[];

export default function AdminIngredientEditForm({ ingredient, initialLinks }: Props) {
  const router = useRouter();

  const [form, setForm] = useState({
    name: ingredient.name,
    category: ingredient.category ?? "",
    description: ingredient.description ?? "",
    unit: ingredient.unit,
    isActive: ingredient.isActive,
  });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [links, setLinks] = useState<PlatformIngredientLink[]>(initialLinks);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

  // Supplier product search
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SupplierProductResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [addingId, setAddingId] = useState<string | null>(null);

  const handleSearch = useCallback(async (q: string) => {
    setSearching(true);
    try {
      const res = await fetch(`/api/admin/supplier-products?q=${encodeURIComponent(q)}&limit=20`);
      const json = await res.json();
      setSearchResults(json.data ?? []);
    } catch {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      handleSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, handleSearch]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setFormError(null);
    try {
      const res = await fetch(`/api/admin/platform-ingredients/${ingredient.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          category: form.category.trim() || null,
          description: form.description.trim() || null,
          unit: form.unit,
          isActive: form.isActive,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to save");
      router.push(`/admin/platform-ingredients/${ingredient.id}`);
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleAddLink(supplierProductId: string) {
    setAddingId(supplierProductId);
    setLinkError(null);
    try {
      const res = await fetch(
        `/api/admin/platform-ingredients/${ingredient.id}/supplier-links`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ supplierProductId }),
        }
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to add link");
      // Refresh links list
      const linksRes = await fetch(
        `/api/admin/platform-ingredients/${ingredient.id}/supplier-links`
      );
      const linksJson = await linksRes.json();
      setLinks(linksJson.data ?? []);
    } catch (err: unknown) {
      setLinkError(err instanceof Error ? err.message : String(err));
    } finally {
      setAddingId(null);
    }
  }

  async function handleRemoveLink(linkId: string) {
    if (!confirm("Remove this supplier product link?")) return;
    setRemovingId(linkId);
    setLinkError(null);
    try {
      const res = await fetch(
        `/api/admin/platform-ingredients/${ingredient.id}/supplier-links/${linkId}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error ?? "Failed to remove link");
      }
      setLinks((prev) => prev.filter((l) => l.id !== linkId));
    } catch (err: unknown) {
      setLinkError(err instanceof Error ? err.message : String(err));
    } finally {
      setRemovingId(null);
    }
  }

  const linkedProductIds = new Set(links.map((l) => l.supplierProductId));

  return (
    <div className="space-y-6">
      {/* Ingredient fields */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-sm font-semibold text-gray-900 mb-4">Ingredient Details</h2>
        {formError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {formError}
          </div>
        )}
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Category</label>
              <input
                type="text"
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                placeholder="e.g. Dairy, Produce, Meat"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Recipe Unit</label>
              <select
                value={form.unit}
                onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value as IngredientUnit }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-500"
              >
                {UNITS.map((u) => (
                  <option key={u} value={u}>
                    {INGREDIENT_UNIT_LABELS[u]} ({u})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
              <input
                type="text"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Optional description"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-500"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isActive"
              checked={form.isActive}
              onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
              className="rounded border-gray-300"
            />
            <label htmlFor="isActive" className="text-sm text-gray-700">
              Active
            </label>
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-700 disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save Changes"}
            </button>
            <Link
              href={`/admin/platform-ingredients/${ingredient.id}`}
              className="px-5 py-2 border border-gray-200 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-50"
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>

      {/* Supplier Product Linking */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900">Linked Supplier Products</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Platform-level links visible to all owners when costing recipes.
          </p>
        </div>

        {linkError && (
          <div className="px-5 py-3 bg-red-50 border-b border-red-100 text-sm text-red-700">
            {linkError}
          </div>
        )}

        {links.length === 0 ? (
          <div className="px-5 py-6 text-center text-sm text-gray-500">
            No supplier products linked yet.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-500 bg-gray-50 border-b border-gray-100">
                <th className="px-5 py-3 text-left font-medium">Product</th>
                <th className="px-5 py-3 text-left font-medium">Supplier</th>
                <th className="px-5 py-3 text-right font-medium">Reference Price</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {links.map((link) => (
                <tr key={link.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3 font-medium text-gray-900">
                    {link.supplierProductName}
                  </td>
                  <td className="px-5 py-3 text-gray-600">{link.supplierName}</td>
                  <td className="px-5 py-3 text-right text-gray-700">
                    ${(link.referencePrice / 100000).toFixed(2)}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <button
                      onClick={() => handleRemoveLink(link.id)}
                      disabled={removingId === link.id}
                      className="text-xs text-red-500 hover:text-red-700 font-medium disabled:opacity-50"
                    >
                      {removingId === link.id ? "Removing…" : "Remove"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Search & add */}
        <div className="px-5 py-4 border-t border-gray-100 space-y-3">
          <h3 className="text-xs font-semibold text-gray-700">Add Supplier Product</h3>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by product name…"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-500"
          />
          {searching && (
            <p className="text-xs text-gray-400">Searching…</p>
          )}
          {searchResults.length > 0 && (
            <div className="rounded-lg border border-gray-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-gray-500 bg-gray-50 border-b border-gray-100">
                    <th className="px-4 py-2 text-left font-medium">Product</th>
                    <th className="px-4 py-2 text-left font-medium">Supplier</th>
                    <th className="px-4 py-2 text-right font-medium">Price</th>
                    <th className="px-4 py-2" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {searchResults.map((p) => {
                    const alreadyLinked = linkedProductIds.has(p.id);
                    return (
                      <tr key={p.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2 font-medium text-gray-900">{p.name}</td>
                        <td className="px-4 py-2 text-gray-600">{p.supplierName}</td>
                        <td className="px-4 py-2 text-right text-gray-700">
                          ${(p.referencePrice / 100000).toFixed(2)}
                        </td>
                        <td className="px-4 py-2 text-right">
                          {alreadyLinked ? (
                            <span className="text-xs text-gray-400">Linked</span>
                          ) : (
                            <button
                              onClick={() => handleAddLink(p.id)}
                              disabled={addingId === p.id}
                              className="text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                            >
                              {addingId === p.id ? "Adding…" : "Add"}
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
