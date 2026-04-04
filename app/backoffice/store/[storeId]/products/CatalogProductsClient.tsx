"use client";

import { useState, useTransition } from "react";
import type { CatalogProduct } from "@prisma/client";

interface Props {
  storeId: string;
  initialProducts: CatalogProduct[];
}

interface ModalState {
  open: boolean;
  editTarget: CatalogProduct | null;
}

const emptyForm = {
  name: "",
  description: "",
  basePriceAmount: "",
  onlineName: "",
  displayOrder: 0,
  isVisibleOnOnlineOrder: true,
  isVisibleOnSubscription: false,
  isFeatured: false,
  imageUrl: "",
};

export default function CatalogProductsClient({ storeId, initialProducts }: Props) {
  const [products, setProducts] = useState<CatalogProduct[]>(initialProducts);
  const [modal, setModal] = useState<ModalState>({ open: false, editTarget: null });
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const isPOS = modal.editTarget?.sourceType === "POS";

  function openCreate() {
    setForm(emptyForm);
    setError(null);
    setModal({ open: true, editTarget: null });
  }

  function openEdit(product: CatalogProduct) {
    setForm({
      name: product.name,
      description: product.description ?? "",
      basePriceAmount: (product.basePriceAmount / 100).toFixed(2),
      onlineName: product.onlineName ?? "",
      displayOrder: product.displayOrder,
      isVisibleOnOnlineOrder: product.isVisibleOnOnlineOrder,
      isVisibleOnSubscription: product.isVisibleOnSubscription,
      isFeatured: product.isFeatured,
      imageUrl: product.imageUrl ?? "",
    });
    setError(null);
    setModal({ open: true, editTarget: product });
  }

  function closeModal() {
    setModal({ open: false, editTarget: null });
    setError(null);
  }

  function handleSave() {
    startTransition(async () => {
      setError(null);
      const isEdit = !!modal.editTarget;
      const url = isEdit
        ? `/api/backoffice/${storeId}/products/${modal.editTarget!.id}`
        : `/api/backoffice/${storeId}/products`;

      const priceInCents = Math.round(parseFloat(form.basePriceAmount) * 100);

      const body = {
        name: form.name,
        description: form.description || undefined,
        basePriceAmount: priceInCents,
        onlineName: form.onlineName || undefined,
        displayOrder: form.displayOrder,
        isVisibleOnOnlineOrder: form.isVisibleOnOnlineOrder,
        isVisibleOnSubscription: form.isVisibleOnSubscription,
        isFeatured: form.isFeatured,
        imageUrl: form.imageUrl || undefined,
      };

      const res = await fetch(url, {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        const { data } = await res.json();
        if (isEdit) {
          setProducts((prev) => prev.map((p) => (p.id === data.id ? data : p)));
        } else {
          setProducts((prev) => [...prev, data]);
        }
        closeModal();
      } else {
        const json = await res.json().catch(() => ({}));
        setError((json as { error?: string }).error ?? "Something went wrong");
      }
    });
  }

  function handleDelete(product: CatalogProduct) {
    if (!window.confirm(`Delete product "${product.name}"? This cannot be undone.`)) return;
    startTransition(async () => {
      const res = await fetch(`/api/backoffice/${storeId}/products/${product.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setProducts((prev) => prev.filter((p) => p.id !== product.id));
      } else {
        const json = await res.json().catch(() => ({}));
        alert((json as { error?: string }).error ?? "Failed to delete product");
      }
    });
  }

  async function toggleVisibility(product: CatalogProduct) {
    const res = await fetch(`/api/backoffice/${storeId}/products/${product.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isVisibleOnOnlineOrder: !product.isVisibleOnOnlineOrder }),
    });
    if (res.ok) {
      const { data } = await res.json();
      setProducts((prev) => prev.map((p) => (p.id === data.id ? data : p)));
    }
  }

  async function toggleFeatured(product: CatalogProduct) {
    const res = await fetch(`/api/backoffice/${storeId}/products/${product.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isFeatured: !product.isFeatured }),
    });
    if (res.ok) {
      const { data } = await res.json();
      setProducts((prev) => prev.map((p) => (p.id === data.id ? data : p)));
    }
  }

  async function toggleSoldOut(product: CatalogProduct) {
    const res = await fetch(`/api/backoffice/${storeId}/products/${product.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isSoldOut: !product.isSoldOut }),
    });
    if (res.ok) {
      const { data } = await res.json();
      setProducts((prev) => prev.map((p) => (p.id === data.id ? data : p)));
    }
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <span className="text-sm text-gray-500">{products.length} products</span>
        <button
          onClick={openCreate}
          className="rounded bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700"
        >
          + New Product
        </button>
      </div>

      {products.length === 0 ? (
        <p className="text-gray-500">No products found.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left font-medium text-gray-500">Product Name</th>
                <th className="px-4 py-2 text-right font-medium text-gray-500">Price</th>
                <th className="px-4 py-2 text-left font-medium text-gray-500">Online Visible</th>
                <th className="px-4 py-2 text-left font-medium text-gray-500">Sold Out</th>
                <th className="px-4 py-2 text-left font-medium text-gray-500">Featured</th>
                <th className="px-4 py-2 text-left font-medium text-gray-500">Source</th>
                <th className="px-4 py-2 text-left font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {products.map((product) => (
                <tr key={product.id}>
                  <td className="px-4 py-2 font-medium text-gray-900">
                    {product.onlineName ?? product.name}
                  </td>
                  <td className="px-4 py-2 text-right text-gray-700">
                    {(product.basePriceAmount / 100).toFixed(2)} {product.currency}
                  </td>
                  <td className="px-4 py-2">
                    <button
                      onClick={() => toggleVisibility(product)}
                      className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${
                        product.isVisibleOnOnlineOrder
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {product.isVisibleOnOnlineOrder ? "Visible" : "Hidden"}
                    </button>
                  </td>
                  <td className="px-4 py-2">
                    <button
                      onClick={() => toggleSoldOut(product)}
                      className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${
                        product.isSoldOut
                          ? "bg-red-100 text-red-700"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {product.isSoldOut ? "Sold Out" : "Available"}
                    </button>
                  </td>
                  <td className="px-4 py-2">
                    <button
                      onClick={() => toggleFeatured(product)}
                      className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${
                        product.isFeatured
                          ? "bg-yellow-100 text-yellow-800"
                          : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {product.isFeatured ? "Featured" : "Normal"}
                    </button>
                  </td>
                  <td className="px-4 py-2">
                    {product.sourceType === "POS" && (
                      <span className="rounded bg-orange-100 px-1.5 py-0.5 text-xs font-medium text-orange-700">
                        POS
                      </span>
                    )}
                  </td>
                  <td className="flex gap-2 px-4 py-2">
                    <button
                      onClick={() => openEdit(product)}
                      className="rounded bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-200"
                    >
                      Edit
                    </button>
                    {product.sourceType !== "POS" && (
                      <button
                        onClick={() => handleDelete(product)}
                        disabled={isPending}
                        className="rounded bg-red-50 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-100"
                      >
                        Delete
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {modal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">
              {modal.editTarget ? "Edit Product" : "New Product"}
            </h2>

            {isPOS && (
              <p className="mb-4 rounded border border-orange-200 bg-orange-50 px-3 py-2 text-sm text-orange-700">
                This item is managed by your POS system. Only display settings can be edited.
              </p>
            )}

            {error && (
              <p className="mb-3 rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
            )}

            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.name}
                  disabled={isPOS}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm disabled:bg-gray-100"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">Description</label>
                <textarea
                  value={form.description}
                  disabled={isPOS}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  rows={2}
                  className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm disabled:bg-gray-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700">
                    Price ($) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.basePriceAmount}
                    disabled={isPOS}
                    onChange={(e) => setForm((f) => ({ ...f, basePriceAmount: e.target.value }))}
                    className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm disabled:bg-gray-100"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700">
                    Display Order
                  </label>
                  <input
                    type="number"
                    value={form.displayOrder}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, displayOrder: parseInt(e.target.value) || 0 }))
                    }
                    className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">Online Name</label>
                <input
                  type="text"
                  value={form.onlineName}
                  onChange={(e) => setForm((f) => ({ ...f, onlineName: e.target.value }))}
                  className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm"
                  placeholder="Display name for online orders"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">Image URL</label>
                <input
                  type="text"
                  value={form.imageUrl}
                  onChange={(e) => setForm((f) => ({ ...f, imageUrl: e.target.value }))}
                  className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm"
                />
              </div>

              <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.isVisibleOnOnlineOrder}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, isVisibleOnOnlineOrder: e.target.checked }))
                    }
                  />
                  Online Visible
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.isVisibleOnSubscription}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, isVisibleOnSubscription: e.target.checked }))
                    }
                  />
                  Subscription Visible
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.isFeatured}
                    onChange={(e) => setForm((f) => ({ ...f, isFeatured: e.target.checked }))}
                  />
                  Featured
                </label>
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={closeModal}
                className="rounded border border-gray-300 px-4 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={
                  isPending ||
                  !form.name.trim() ||
                  (!isPOS && !form.basePriceAmount)
                }
                className="rounded bg-indigo-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                {isPending ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
