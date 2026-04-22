"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { IngredientSupplierLink } from "@/types/owner-suppliers";
import type { Supplier, SupplierProduct } from "@/types/owner-suppliers";

interface Props {
  ingredientId: string;
  initialLinks: IngredientSupplierLink[];
}

function formatPrice(millicents: number) {
  return `$${(millicents / 100000).toFixed(2)}`;
}

function formatDate(iso: string | null) {
  if (!iso) return "Never";
  return new Date(iso).toLocaleString("en-NZ", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

interface SupplierSearchResult {
  items: Supplier[];
  total: number;
}

interface ProductSearchResult {
  items: SupplierProduct[];
}

export default function IngredientSupplierLinkPanel({
  ingredientId,
  initialLinks,
}: Props) {
  const router = useRouter();
  const [links, setLinks] = useState<IngredientSupplierLink[]>(initialLinks);
  const [showAdd, setShowAdd] = useState(false);
  const [supplierQuery, setSupplierQuery] = useState("");
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [selectedSupplierId, setSelectedSupplierId] = useState<string | null>(null);
  const [products, setProducts] = useState<SupplierProduct[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [addAsPreferred, setAddAsPreferred] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const cheapestLink = links.length > 1
    ? links.reduce((min, l) =>
        l.referencePrice > 0 && l.referencePrice < (min?.referencePrice ?? Infinity) ? l : min,
        null as IngredientSupplierLink | null
      )
    : null;

  async function searchSuppliers() {
    if (!supplierQuery.trim()) return;
    startTransition(async () => {
      try {
        const res = await fetch(
          `/api/owner/suppliers?q=${encodeURIComponent(supplierQuery)}&pageSize=20`
        );
        const data = await res.json();
        setSuppliers((data.data as SupplierSearchResult).items ?? []);
        setSelectedSupplierId(null);
        setProducts([]);
      } catch {
        setError("Failed to search suppliers.");
      }
    });
  }

  async function loadProducts(supplierId: string) {
    setSelectedSupplierId(supplierId);
    setProducts([]);
    try {
      const res = await fetch(`/api/owner/suppliers/${supplierId}/products`);
      const data = await res.json();
      setProducts((data.data as ProductSearchResult).items ?? []);
    } catch {
      setError("Failed to load products.");
    }
  }

  async function handleAddLink() {
    if (!selectedProductId) return;
    setError(null);
    try {
      const res = await fetch(
        `/api/owner/ingredients/${ingredientId}/supplier-links`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            supplierProductId: selectedProductId,
            isPreferred: addAsPreferred,
          }),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to add link.");
        return;
      }
      const newLink = data.data as IngredientSupplierLink;
      setLinks((prev) => {
        const updated = prev.filter((l) => l.id !== newLink.id);
        if (addAsPreferred) {
          return [...updated.map((l) => ({ ...l, isPreferred: false })), newLink];
        }
        return [...updated, newLink];
      });
      setShowAdd(false);
      setSupplierQuery("");
      setSuppliers([]);
      setProducts([]);
      setSelectedProductId(null);
      setSelectedSupplierId(null);
      setAddAsPreferred(false);
      router.refresh();
    } catch {
      setError("Network error.");
    }
  }

  async function handleSetPreferred(link: IngredientSupplierLink) {
    setTogglingId(link.id);
    setError(null);
    try {
      const res = await fetch(
        `/api/owner/ingredients/${ingredientId}/supplier-links/${link.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isPreferred: true }),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to set preferred.");
        return;
      }
      const updated = data.data as IngredientSupplierLink;
      setLinks((prev) =>
        prev.map((l) =>
          l.id === updated.id
            ? { ...l, isPreferred: true }
            : { ...l, isPreferred: false }
        )
      );
      router.refresh();
    } catch {
      setError("Network error.");
    } finally {
      setTogglingId(null);
    }
  }

  async function handleDelete(linkId: string) {
    if (!confirm("Remove this supplier link?")) return;
    setDeletingId(linkId);
    setError(null);
    try {
      const res = await fetch(
        `/api/owner/ingredients/${ingredientId}/supplier-links/${linkId}`,
        { method: "DELETE" }
      );
      if (res.ok) {
        setLinks((prev) => prev.filter((l) => l.id !== linkId));
        router.refresh();
      } else {
        const data = await res.json();
        setError(data.error ?? "Failed to remove link.");
      }
    } catch {
      setError("Network error.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-900">Supplier Products</h2>
        <button
          type="button"
          onClick={() => setShowAdd((v) => !v)}
          className="px-3 py-1.5 text-xs font-medium bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition"
        >
          {showAdd ? "✕ Cancel" : "+ Add Supplier Product"}
        </button>
      </div>

      {error && (
        <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
      )}

      {/* Existing links */}
      {links.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-4 border border-dashed border-gray-200 rounded-lg">
          No supplier products linked yet. Click &quot;+ Add Supplier Product&quot; to connect one.
        </p>
      ) : (
        <div className="divide-y divide-gray-100 border border-gray-200 rounded-lg overflow-hidden">
          {links.map((link) => (
            <div
              key={link.id}
              className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium text-gray-900 truncate">
                    {link.supplierProductName}
                  </span>
                  <span className="text-xs text-gray-400">{link.supplierName}</span>
                  {link.isPreferred && (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">
                      ★ Preferred
                    </span>
                  )}
                  {cheapestLink?.id === link.id && (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700">
                      Cheapest
                    </span>
                  )}
                  {link.tenantId === null && (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-500">
                      Platform
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-500">
                  <span className="font-medium">{formatPrice(link.referencePrice)}</span>
                  <span>Last scraped: {formatDate(link.lastScrapedAt)}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {!link.isPreferred && (
                  <button
                    type="button"
                    onClick={() => handleSetPreferred(link)}
                    disabled={togglingId === link.id}
                    aria-label={`Set ${link.supplierProductName} as preferred`}
                    className="text-xs text-brand-600 hover:text-brand-800 font-medium disabled:opacity-50"
                  >
                    {togglingId === link.id ? "Setting…" : "Set Preferred"}
                  </button>
                )}
                {link.tenantId !== null && (
                  <button
                    type="button"
                    onClick={() => handleDelete(link.id)}
                    disabled={deletingId === link.id}
                    aria-label={`Remove ${link.supplierProductName}`}
                    className="text-xs text-red-500 hover:text-red-700 font-medium disabled:opacity-50"
                  >
                    {deletingId === link.id ? "Removing…" : "Remove"}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add link form */}
      {showAdd && (
        <div className="border border-gray-200 rounded-xl p-4 space-y-4 bg-gray-50">
          <p className="text-xs font-medium text-gray-600">Search for a supplier, then select a product.</p>

          {/* Supplier search */}
          <div className="flex gap-2">
            <input
              type="text"
              value={supplierQuery}
              onChange={(e) => setSupplierQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && searchSuppliers()}
              placeholder="Supplier name…"
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            <button
              type="button"
              onClick={searchSuppliers}
              disabled={isPending}
              className="px-4 py-2 bg-white border border-gray-300 text-sm font-medium rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              {isPending ? "Searching…" : "Search"}
            </button>
          </div>

          {/* Supplier results */}
          {suppliers.length > 0 && (
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {suppliers.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => loadProducts(s.id)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm border transition-colors ${
                    selectedSupplierId === s.id
                      ? "border-brand-500 bg-brand-50 text-brand-700"
                      : "border-gray-200 hover:border-gray-300 hover:bg-white"
                  }`}
                >
                  {s.name}
                  {s.websiteUrl && (
                    <span className="ml-2 text-xs text-gray-400">{s.websiteUrl}</span>
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Product results */}
          {products.length > 0 && (
            <div className="space-y-1 max-h-40 overflow-y-auto">
              <p className="text-xs text-gray-500">Select a product:</p>
              {products.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setSelectedProductId(p.id)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm border transition-colors ${
                    selectedProductId === p.id
                      ? "border-brand-500 bg-brand-50 text-brand-700"
                      : "border-gray-200 hover:border-gray-300 hover:bg-white"
                  }`}
                >
                  <span className="font-medium">{p.name}</span>
                  <span className="ml-2 text-gray-500 text-xs">
                    {formatPrice(p.referencePrice)}
                  </span>
                </button>
              ))}
            </div>
          )}

          {selectedProductId && (
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={addAsPreferred}
                  onChange={(e) => setAddAsPreferred(e.target.checked)}
                  className="rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                />
                Set as preferred
              </label>
              <button
                type="button"
                onClick={handleAddLink}
                className="px-4 py-1.5 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 transition"
              >
                Add Link
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
