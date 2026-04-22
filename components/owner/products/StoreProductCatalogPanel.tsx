"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { StoreProductSelectionRow, TenantProductRow } from "@/types/owner";

function formatPrice(amount: number, currency: string) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount / 100000);
}

interface Props {
  storeId: string;
  selections: StoreProductSelectionRow[];
  availableProducts?: TenantProductRow[];
  mode?: "view" | "add";
}

export default function StoreProductCatalogPanel({
  storeId,
  selections,
  availableProducts = [],
  mode = "view",
}: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Inline price editing state: maps tenantProductId -> draft dollar string
  const [editingPrice, setEditingPrice] = useState<string | null>(null);
  const [priceInput, setPriceInput] = useState("");

  async function handleDeselect(tenantProductId: string) {
    if (!confirm("Remove this product from the store?")) return;
    setLoading(tenantProductId);
    setError(null);
    try {
      const res = await fetch(
        `/api/owner/stores/${storeId}/product-selections/${tenantProductId}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error ?? "Failed to remove product");
      }
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(null);
    }
  }

  async function handleSelect(tenantProductId: string) {
    setLoading(tenantProductId);
    setError(null);
    try {
      const res = await fetch(`/api/owner/stores/${storeId}/product-selections`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantProductId }),
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error ?? "Failed to add product");
      }
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(null);
    }
  }

  function startEditPrice(tenantProductId: string, currentCustom: number | null, basePrice: number) {
    setEditingPrice(tenantProductId);
    const displayAmount = currentCustom !== null ? currentCustom : basePrice;
    setPriceInput((displayAmount / 100000).toFixed(2));
  }

  async function handleSavePrice(tenantProductId: string) {
    setLoading(tenantProductId);
    setError(null);
    try {
      const dollarValue = parseFloat(priceInput);
      if (isNaN(dollarValue) || dollarValue < 0) throw new Error("Price must be a positive number");
      const customPriceAmount = Math.round(dollarValue * 100000);
      const res = await fetch(
        `/api/owner/stores/${storeId}/product-selections/${tenantProductId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ customPriceAmount }),
        }
      );
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error ?? "Failed to update price");
      }
      setEditingPrice(null);
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(null);
    }
  }

  async function handleClearPrice(tenantProductId: string) {
    setLoading(tenantProductId);
    setError(null);
    try {
      const res = await fetch(
        `/api/owner/stores/${storeId}/product-selections/${tenantProductId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ customPriceAmount: null }),
        }
      );
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error ?? "Failed to clear price");
      }
      setEditingPrice(null);
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(null);
    }
  }

  if (mode === "add") {
    return (
      <div>
        {error && (
          <div className="px-4 py-3 bg-red-50 border-b border-red-100 text-sm text-red-700">
            {error}
          </div>
        )}
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">Product</th>
              <th className="text-right px-4 py-2.5 text-xs font-medium text-gray-500">Base Price</th>
              <th className="text-center px-4 py-2.5 text-xs font-medium text-gray-500">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {availableProducts.map((p) => (
              <tr key={p.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <div className="font-medium text-gray-900">{p.name}</div>
                  {p.shortDescription && (
                    <div className="text-xs text-gray-400 mt-0.5">{p.shortDescription}</div>
                  )}
                </td>
                <td className="px-4 py-3 text-right text-gray-600">
                  {formatPrice(p.basePriceAmount, p.currency)}
                </td>
                <td className="px-4 py-3 text-center">
                  <button
                    onClick={() => handleSelect(p.id)}
                    disabled={loading === p.id}
                    className="px-3 py-1 bg-brand-600 text-white text-xs font-medium rounded hover:bg-brand-700 disabled:opacity-50 transition-colors"
                  >
                    {loading === p.id ? "Adding..." : "Add to Store"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div>
      {error && (
        <div className="px-4 py-3 bg-red-50 border-b border-red-100 text-sm text-red-700">
          {error}
        </div>
      )}
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">Product</th>
            <th className="text-right px-4 py-2.5 text-xs font-medium text-gray-500">Catalog Price</th>
            <th className="text-right px-4 py-2.5 text-xs font-medium text-gray-500">Store Price</th>
            <th className="text-center px-4 py-2.5 text-xs font-medium text-gray-500">Status</th>
            <th className="text-center px-4 py-2.5 text-xs font-medium text-gray-500">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {selections.map((s) => (
            <tr key={s.id} className="hover:bg-gray-50">
              <td className="px-4 py-3">
                <div className="font-medium text-gray-900">{s.product.name}</div>
                {s.product.shortDescription && (
                  <div className="text-xs text-gray-400 mt-0.5">{s.product.shortDescription}</div>
                )}
              </td>
              <td className="px-4 py-3 text-right text-gray-500">
                {formatPrice(s.product.basePriceAmount, s.product.currency)}
              </td>
              <td className="px-4 py-3 text-right">
                {editingPrice === s.tenantProductId ? (
                  <div className="flex items-center justify-end gap-1.5">
                    <span className="text-gray-500 text-xs">$</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={priceInput}
                      onChange={(e) => setPriceInput(e.target.value)}
                      className="w-24 rounded border border-gray-300 px-2 py-0.5 text-sm text-right focus:outline-none focus:ring-2 focus:ring-brand-500"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleSavePrice(s.tenantProductId);
                        if (e.key === "Escape") setEditingPrice(null);
                      }}
                      autoFocus
                    />
                    <button
                      onClick={() => handleSavePrice(s.tenantProductId)}
                      disabled={loading === s.tenantProductId}
                      className="text-xs px-2 py-0.5 bg-brand-600 text-white rounded hover:bg-brand-700 disabled:opacity-50"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setEditingPrice(null)}
                      className="text-xs px-2 py-0.5 border border-gray-200 rounded text-gray-500 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-end gap-2">
                    {s.customPriceAmount !== null ? (
                      <>
                        <span className="text-gray-900 font-medium">
                          {formatPrice(s.effectivePriceAmount, s.product.currency)}
                          <span className="ml-1 text-xs text-blue-500">(custom)</span>
                        </span>
                        <button
                          onClick={() => handleClearPrice(s.tenantProductId)}
                          disabled={loading === s.tenantProductId}
                          title="Reset to catalog price"
                          className="text-xs text-gray-400 hover:text-red-500 disabled:opacity-50"
                        >
                          ✕
                        </button>
                      </>
                    ) : (
                      <span className="text-gray-400 text-xs">uses catalog</span>
                    )}
                    <button
                      onClick={() =>
                        startEditPrice(
                          s.tenantProductId,
                          s.customPriceAmount,
                          s.product.basePriceAmount
                        )
                      }
                      className="text-xs text-brand-600 hover:text-brand-800 font-medium"
                    >
                      Edit
                    </button>
                  </div>
                )}
              </td>
              <td className="px-4 py-3 text-center">
                <span
                  className={`text-xs font-medium px-1.5 py-0.5 rounded ${
                    s.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-400"
                  }`}
                >
                  {s.isActive ? "Active" : "Inactive"}
                </span>
              </td>
              <td className="px-4 py-3 text-center">
                <button
                  onClick={() => handleDeselect(s.tenantProductId)}
                  disabled={loading === s.tenantProductId}
                  className="px-2.5 py-1 border border-red-200 text-red-600 text-xs font-medium rounded hover:bg-red-50 disabled:opacity-50 transition-colors"
                >
                  {loading === s.tenantProductId ? "Removing..." : "Remove"}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

