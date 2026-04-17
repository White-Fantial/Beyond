"use client";

import { useState, useTransition } from "react";
import type { CatalogCategory } from "@prisma/client";

interface Props {
  storeId: string;
  initialCategories: CatalogCategory[];
}

interface ModalState {
  open: boolean;
  editTarget: CatalogCategory | null;
}

const emptyForm = {
  name: "",
  description: "",
  displayOrder: 0,
  isVisibleOnOnlineOrder: true,
  isVisibleOnSubscription: false,
  imageUrl: "",
};

export default function CatalogCategoriesClient({ storeId, initialCategories }: Props) {
  const [categories, setCategories] = useState<CatalogCategory[]>(initialCategories);
  const [modal, setModal] = useState<ModalState>({ open: false, editTarget: null });
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const isPOS = modal.editTarget?.sourceType === "POS";
  // Phase 1: isPOS is kept for informational use only — it no longer restricts editing.

  function openCreate() {
    setForm(emptyForm);
    setError(null);
    setModal({ open: true, editTarget: null });
  }

  function openEdit(cat: CatalogCategory) {
    setForm({
      name: cat.name,
      description: cat.description ?? "",
      displayOrder: cat.displayOrder,
      isVisibleOnOnlineOrder: cat.isVisibleOnOnlineOrder,
      isVisibleOnSubscription: cat.isVisibleOnSubscription,
      imageUrl: cat.imageUrl ?? "",
    });
    setError(null);
    setModal({ open: true, editTarget: cat });
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
        ? `/api/backoffice/${storeId}/categories/${modal.editTarget!.id}`
        : `/api/backoffice/${storeId}/categories`;

      const body = {
        name: form.name,
        description: form.description || undefined,
        displayOrder: form.displayOrder,
        isVisibleOnOnlineOrder: form.isVisibleOnOnlineOrder,
        isVisibleOnSubscription: form.isVisibleOnSubscription,
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
          setCategories((prev) => prev.map((c) => (c.id === data.id ? data : c)));
        } else {
          setCategories((prev) => [...prev, data]);
        }
        closeModal();
      } else {
        const json = await res.json().catch(() => ({}));
        setError((json as { error?: string }).error ?? "Something went wrong");
      }
    });
  }

  function handleDelete(cat: CatalogCategory) {
    if (!window.confirm(`Delete category "${cat.name}"? This cannot be undone.`)) return;
    startTransition(async () => {
      const res = await fetch(`/api/backoffice/${storeId}/categories/${cat.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setCategories((prev) => prev.filter((c) => c.id !== cat.id));
      } else {
        const json = await res.json().catch(() => ({}));
        alert((json as { error?: string }).error ?? "Failed to delete category");
      }
    });
  }

  async function toggleVisibility(cat: CatalogCategory) {
    const res = await fetch(`/api/backoffice/${storeId}/categories/${cat.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isVisibleOnOnlineOrder: !cat.isVisibleOnOnlineOrder }),
    });
    if (res.ok) {
      const { data } = await res.json();
      setCategories((prev) => prev.map((c) => (c.id === data.id ? data : c)));
    }
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <span className="text-sm text-gray-500">{categories.length} categories</span>
        <button
          onClick={openCreate}
          className="rounded bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700"
        >
          + New Category
        </button>
      </div>

      {categories.length === 0 ? (
        <p className="text-gray-500">No categories found.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left font-medium text-gray-500">Order</th>
                <th className="px-4 py-2 text-left font-medium text-gray-500">Category</th>
                <th className="px-4 py-2 text-left font-medium text-gray-500">Online Visible</th>
                <th className="px-4 py-2 text-left font-medium text-gray-500">Sub Visible</th>
                <th className="px-4 py-2 text-left font-medium text-gray-500">Source</th>
                <th className="px-4 py-2 text-left font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {categories.map((cat) => (
                <tr key={cat.id}>
                  <td className="px-4 py-2 text-gray-500">{cat.displayOrder}</td>
                  <td className="px-4 py-2 font-medium text-gray-900">{cat.name}</td>
                  <td className="px-4 py-2">
                    <button
                      onClick={() => toggleVisibility(cat)}
                      className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${
                        cat.isVisibleOnOnlineOrder
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {cat.isVisibleOnOnlineOrder ? "Visible" : "Hidden"}
                    </button>
                  </td>
                  <td className="px-4 py-2">
                    <span
                      className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${
                        cat.isVisibleOnSubscription
                          ? "bg-blue-100 text-blue-800"
                          : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {cat.isVisibleOnSubscription ? "Visible" : "Hidden"}
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    {cat.sourceType === "POS" && (
                      <span className="rounded bg-blue-50 px-1.5 py-0.5 text-xs font-medium text-blue-600" title="Originally imported from POS">
                        Imported
                      </span>
                    )}
                  </td>
                  <td className="flex gap-2 px-4 py-2">
                    <button
                      onClick={() => openEdit(cat)}
                      className="rounded bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-200"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(cat)}
                      disabled={isPending}
                      className="rounded bg-red-50 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-100"
                    >
                      Delete
                    </button>
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
              {modal.editTarget ? "Edit Category" : "New Category"}
            </h2>

            {isPOS && (
              <p className="mb-4 rounded border border-blue-100 bg-blue-50 px-3 py-2 text-sm text-blue-600">
                Origin: Imported from POS. All fields are editable in Beyond.
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
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  rows={2}
                  className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm"
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

              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">Image URL</label>
                <input
                  type="text"
                  value={form.imageUrl}
                  onChange={(e) => setForm((f) => ({ ...f, imageUrl: e.target.value }))}
                  className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm"
                />
              </div>

              <div className="flex gap-6">
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
                disabled={isPending || !form.name.trim()}
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
