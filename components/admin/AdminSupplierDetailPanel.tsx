"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type {
  SupplierDetail,
  UpsertSupplierProductInput,
} from "@/types/owner-suppliers";

interface Props {
  supplier: SupplierDetail;
}

const UNITS = ["GRAM", "KG", "ML", "LITER", "EACH", "DOZEN", "OZ", "LB"] as const;

export default function AdminSupplierDetailPanel({ supplier }: Props) {
  const router = useRouter();

  // New product state
  const [showProductForm, setShowProductForm] = useState(false);
  const [productName, setProductName] = useState("");
  const [productUrl, setProductUrl] = useState("");
  const [productPrice, setProductPrice] = useState("");
  const [productQty, setProductQty] = useState("1");
  const [productUnit, setProductUnit] = useState<string>("EACH");
  const [savingProduct, setSavingProduct] = useState(false);
  const [productError, setProductError] = useState<string | null>(null);
  const [csvText, setCsvText] = useState("");
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importSummary, setImportSummary] = useState<{
    totalRows: number;
    successCount: number;
    failedCount: number;
    createdCount: number;
    updatedCount: number;
    errors: Array<{ row: number; reason: string }>;
  } | null>(null);

  async function handleAddProduct(e: React.FormEvent) {
    e.preventDefault();
    setSavingProduct(true);
    setProductError(null);
    try {
      const body: UpsertSupplierProductInput = {
        name: productName,
        externalUrl: productUrl || undefined,
        referencePrice: Math.round(parseFloat(productPrice) * 100000),
        purchaseQty: parseFloat(productQty) || 1,
        unit: productUnit as UpsertSupplierProductInput["unit"],
      };
      const res = await fetch(`/api/admin/suppliers/${supplier.id}/products`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json();
        setProductError(data.error ?? "Failed to add product");
        return;
      }
      setProductName("");
      setProductUrl("");
      setProductPrice("");
      setProductQty("1");
      setProductUnit("EACH");
      setShowProductForm(false);
      router.refresh();
    } catch {
      setProductError("Network error. Please try again.");
    } finally {
      setSavingProduct(false);
    }
  }

  async function handleDeleteProduct(productId: string) {
    if (!confirm("Delete this product?")) return;
    await fetch(`/api/admin/suppliers/${supplier.id}/products/${productId}`, {
      method: "DELETE",
    });
    router.refresh();
  }

  async function handleImportProducts(e: React.FormEvent) {
    e.preventDefault();
    setImporting(true);
    setImportError(null);
    setImportSummary(null);
    try {
      const formData = new FormData();
      if (csvFile) formData.set("csvFile", csvFile);
      if (csvText.trim()) formData.set("csvText", csvText);

      const res = await fetch(`/api/admin/suppliers/${supplier.id}/products/import`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        setImportError(data.error ?? "Failed to import products");
        return;
      }
      setImportSummary(data.data);
      setCsvText("");
      setCsvFile(null);
      router.refresh();
    } catch {
      setImportError("Network error. Please try again.");
    } finally {
      setImporting(false);
    }
  }

  return (
    <>
      {/* Products */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-900">
            Products ({supplier.products.length})
          </h2>
          <button
            onClick={() => setShowProductForm((v) => !v)}
            className="px-3 py-1.5 bg-gray-900 text-white text-xs font-medium rounded-lg hover:bg-gray-700"
          >
            {showProductForm ? "Cancel" : "+ Add Product"}
          </button>
        </div>

        {showProductForm && (
          <div className="px-5 py-4 border-b border-gray-100 bg-gray-50 space-y-6">
            <form onSubmit={handleAddProduct} className="space-y-3">
              <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                Add one product
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Name *</label>
                  <input
                    required
                    value={productName}
                    onChange={(e) => setProductName(e.target.value)}
                    placeholder="High Grade Flour 25kg"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Reference Price ($) *
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    value={productPrice}
                    onChange={(e) => setProductPrice(e.target.value)}
                    placeholder="12.50"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Purchase Qty *
                  </label>
                  <input
                    type="number"
                    required
                    min="0.0001"
                    step="any"
                    value={productQty}
                    onChange={(e) => setProductQty(e.target.value)}
                    placeholder="25"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Unit *</label>
                  <select
                    value={productUnit}
                    onChange={(e) => setProductUnit(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none"
                  >
                    {UNITS.map((u) => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                </div>
              </div>
              {productError && <p className="text-xs text-red-600">{productError}</p>}
              <button
                type="submit"
                disabled={savingProduct}
                className="px-4 py-1.5 bg-gray-900 text-white text-xs font-medium rounded-lg hover:bg-gray-700 disabled:opacity-50"
              >
                {savingProduct ? "Adding…" : "Add Product"}
              </button>
            </form>

            <form onSubmit={handleImportProducts} className="space-y-3 border-t border-gray-200 pt-4">
              <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                Bulk import (CSV)
              </h3>
              <p className="text-xs text-gray-500">
                Required columns: <code>name,referencePrice,purchaseQty,unit</code>. Optional:
                <code> externalUrl</code>. Price is in dollars.
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    CSV file
                  </label>
                  <input
                    type="file"
                    accept=".csv,text/csv"
                    onChange={(e) => setCsvFile(e.target.files?.[0] ?? null)}
                    className="block w-full text-xs text-gray-700"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    CSV text
                  </label>
                  <textarea
                    value={csvText}
                    onChange={(e) => setCsvText(e.target.value)}
                    rows={6}
                    placeholder={"name,externalUrl,referencePrice,purchaseQty,unit\nTomatoes,,3.50,5,KG"}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs focus:outline-none font-mono"
                  />
                </div>
              </div>
              {importError && <p className="text-xs text-red-600">{importError}</p>}
              {importSummary && (
                <div className="rounded-lg border border-gray-200 bg-white p-3 text-xs text-gray-700 space-y-1">
                  <p>Total rows: {importSummary.totalRows}</p>
                  <p>Success: {importSummary.successCount}</p>
                  <p>Failed: {importSummary.failedCount}</p>
                  <p>Created: {importSummary.createdCount}</p>
                  <p>Updated: {importSummary.updatedCount}</p>
                  {importSummary.errors.length > 0 && (
                    <ul className="list-disc list-inside text-red-600">
                      {importSummary.errors.slice(0, 10).map((error) => (
                        <li key={`${error.row}-${error.reason}`}>
                          Row {error.row}: {error.reason}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
              <button
                type="submit"
                disabled={importing}
                className="px-4 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-500 disabled:opacity-50"
              >
                {importing ? "Importing…" : "Import CSV"}
              </button>
            </form>
          </div>
        )}

        {supplier.products.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-gray-500">
            No products yet. Add one above.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-500 bg-gray-50 border-b border-gray-100">
                <th className="px-5 py-3 text-left font-medium">Product</th>
                <th className="px-5 py-3 text-left font-medium">Package</th>
                <th className="px-5 py-3 text-right font-medium">Price</th>
                <th className="px-5 py-3 text-right font-medium">Unit Cost</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {supplier.products.map((p) => {
                const unitCost = p.purchaseQty > 0
                  ? p.referencePrice / p.purchaseQty / 100000
                  : 0;
                return (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-5 py-3">
                      <div className="font-medium">
                        <Link
                          href={`/admin/suppliers/${supplier.id}/products/${p.id}`}
                          className="text-blue-600 hover:underline"
                        >
                          {p.name}
                        </Link>
                      </div>
                      {p.externalUrl && (
                        <a
                          href={p.externalUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-600 hover:underline"
                        >
                          {p.externalUrl}
                        </a>
                      )}
                    </td>
                    <td className="px-5 py-3 text-gray-600">
                      {p.purchaseQty} {p.unit}
                    </td>
                    <td className="px-5 py-3 text-right text-gray-700">
                      ${(p.referencePrice / 100000).toFixed(2)}
                    </td>
                    <td className="px-5 py-3 text-right text-gray-500 text-xs">
                      ${unitCost.toFixed(4)}/{p.unit}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <Link
                        href={`/admin/suppliers/${supplier.id}/products/${p.id}/edit`}
                        className="text-blue-600 hover:text-blue-800 text-xs font-medium mr-3"
                      >
                        Edit
                      </Link>
                      <button
                        onClick={() => handleDeleteProduct(p.id)}
                        className="text-red-500 hover:text-red-700 text-xs font-medium"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
