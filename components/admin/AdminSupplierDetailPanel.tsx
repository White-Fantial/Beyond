"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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

  // Edit supplier state
  const [editName, setEditName] = useState(supplier.name);
  const [editWebsite, setEditWebsite] = useState(supplier.websiteUrl ?? "");
  const [editEmail, setEditEmail] = useState(supplier.contactEmail ?? "");
  const [editPhone, setEditPhone] = useState(supplier.contactPhone ?? "");
  const [editNotes, setEditNotes] = useState(supplier.notes ?? "");
  const [savingSupplier, setSavingSupplier] = useState(false);
  const [supplierError, setSupplierError] = useState<string | null>(null);

  // New product state
  const [showProductForm, setShowProductForm] = useState(false);
  const [productName, setProductName] = useState("");
  const [productUrl, setProductUrl] = useState("");
  const [productPrice, setProductPrice] = useState("");
  const [productUnit, setProductUnit] = useState<string>("EACH");
  const [savingProduct, setSavingProduct] = useState(false);
  const [productError, setProductError] = useState<string | null>(null);

  async function handleSaveSupplier(e: React.FormEvent) {
    e.preventDefault();
    setSavingSupplier(true);
    setSupplierError(null);
    try {
      const res = await fetch(`/api/admin/suppliers/${supplier.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName,
          websiteUrl: editWebsite || null,
          contactEmail: editEmail || null,
          contactPhone: editPhone || null,
          notes: editNotes || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setSupplierError(data.error ?? "Failed to update supplier");
        return;
      }
      router.refresh();
    } catch {
      setSupplierError("Network error. Please try again.");
    } finally {
      setSavingSupplier(false);
    }
  }

  async function handleDeleteSupplier() {
    if (!confirm(`Delete supplier "${supplier.name}"? This cannot be undone.`)) return;
    try {
      await fetch(`/api/admin/suppliers/${supplier.id}`, { method: "DELETE" });
      router.push("/admin/suppliers");
    } catch {
      // ignore
    }
  }

  async function handleAddProduct(e: React.FormEvent) {
    e.preventDefault();
    setSavingProduct(true);
    setProductError(null);
    try {
      const body: UpsertSupplierProductInput = {
        name: productName,
        externalUrl: productUrl || undefined,
        referencePrice: Math.round(parseFloat(productPrice) * 100000),
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

  return (
    <div className="space-y-6">
      {/* Edit supplier */}
      <form
        onSubmit={handleSaveSupplier}
        className="bg-white rounded-xl border border-gray-200 p-5 space-y-4"
      >
        <h2 className="text-sm font-semibold text-gray-900">Supplier Details</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Name *</label>
            <input
              required
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Website URL</label>
            <input
              type="url"
              value={editWebsite}
              onChange={(e) => setEditWebsite(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Contact Email</label>
            <input
              type="email"
              value={editEmail}
              onChange={(e) => setEditEmail(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Contact Phone</label>
            <input
              type="tel"
              value={editPhone}
              onChange={(e) => setEditPhone(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-500"
            />
          </div>
          <div className="sm:col-span-2 lg:col-span-4">
            <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
            <textarea
              rows={2}
              value={editNotes}
              onChange={(e) => setEditNotes(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-500"
            />
          </div>
        </div>
        {supplierError && <p className="text-sm text-red-600">{supplierError}</p>}
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={savingSupplier}
            className="px-5 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-700 disabled:opacity-50"
          >
            {savingSupplier ? "Saving…" : "Save Changes"}
          </button>
          <button
            type="button"
            onClick={handleDeleteSupplier}
            className="px-5 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700"
          >
            Delete Supplier
          </button>
        </div>
      </form>

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
          <form
            onSubmit={handleAddProduct}
            className="px-5 py-4 border-b border-gray-100 bg-gray-50 space-y-3"
          >
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
                  Price (USD) *
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
                <th className="px-5 py-3 text-left font-medium">Unit</th>
                <th className="px-5 py-3 text-right font-medium">Price</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {supplier.products.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3">
                    <div className="font-medium text-gray-900">{p.name}</div>
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
                  <td className="px-5 py-3 text-gray-600">{p.unit}</td>
                  <td className="px-5 py-3 text-right text-gray-700">
                   ${(p.referencePrice / 100000).toFixed(2)}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <button
                      onClick={() => handleDeleteProduct(p.id)}
                      className="text-red-500 hover:text-red-700 text-xs font-medium"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
