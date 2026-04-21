"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { StoreProductSelectionRow, TenantProductRow } from "@/types/owner";

function formatPrice(amount: number, currency: string) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount / 100);
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
                {s.customPriceAmount !== null ? (
                  <span className="text-gray-900 font-medium">
                    {formatPrice(s.effectivePriceAmount, s.product.currency)}
                    <span className="ml-1 text-xs text-blue-500">(custom)</span>
                  </span>
                ) : (
                  <span className="text-gray-400 text-xs">uses catalog</span>
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
