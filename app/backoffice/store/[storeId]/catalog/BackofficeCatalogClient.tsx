"use client";

import { useState } from "react";
import type {
  CatalogCategory,
  CatalogProduct,
  CatalogModifierGroup,
  CatalogModifierOption,
} from "@prisma/client";

type CategoryWithProducts = CatalogCategory & { products: CatalogProduct[] };
type GroupWithOptions = CatalogModifierGroup & { options: CatalogModifierOption[] };

interface Props {
  storeId: string;
  initialCategories: CategoryWithProducts[];
  initialModifierGroups: GroupWithOptions[];
}

function SoldOutBadge() {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700">
      Sold Out
    </span>
  );
}

export default function BackofficeCatalogClient({
  storeId,
  initialCategories,
  initialModifierGroups,
}: Props) {
  const [tab, setTab] = useState<"products" | "modifiers">("products");
  const [categories, setCategories] = useState(initialCategories);
  const [modifierGroups, setModifierGroups] = useState(initialModifierGroups);
  const [error, setError] = useState<string | null>(null);

  async function handleBulkRestore() {
    const snapshot = categories;
    setCategories((prev) =>
      prev.map((c) => ({
        ...c,
        products: c.products.map((p) => ({ ...p, isSoldOut: false })),
      }))
    );
    const res = await fetch(`/api/backoffice/${storeId}/catalog/products`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "bulkRestore" }),
    });
    if (!res.ok) {
      setCategories(snapshot);
      const body = await res.json().catch(() => null);
      setError(body?.error ?? `Bulk restore failed (${res.status})`);
    }
  }

  async function toggleProductSoldOut(
    categoryId: string,
    productId: string,
    current: boolean
  ) {
    setCategories((prev) =>
      prev.map((c) =>
        c.id !== categoryId
          ? c
          : {
              ...c,
              products: c.products.map((p) =>
                p.id !== productId ? p : { ...p, isSoldOut: !current }
              ),
            }
      )
    );
    const res = await fetch(`/api/backoffice/${storeId}/catalog/products/${productId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isSoldOut: !current }),
    });
    if (!res.ok) {
      setCategories((prev) =>
        prev.map((c) =>
          c.id !== categoryId
            ? c
            : {
                ...c,
                products: c.products.map((p) =>
                  p.id !== productId ? p : { ...p, isSoldOut: current }
                ),
              }
        )
      );
    }
  }

  async function toggleProductVisibility(
    categoryId: string,
    productId: string,
    current: boolean
  ) {
    setCategories((prev) =>
      prev.map((c) =>
        c.id !== categoryId
          ? c
          : {
              ...c,
              products: c.products.map((p) =>
                p.id !== productId ? p : { ...p, isVisibleOnOnlineOrder: !current }
              ),
            }
      )
    );
    const res = await fetch(`/api/backoffice/${storeId}/catalog/products/${productId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isVisibleOnOnlineOrder: !current }),
    });
    if (!res.ok) {
      setCategories((prev) =>
        prev.map((c) =>
          c.id !== categoryId
            ? c
            : {
                ...c,
                products: c.products.map((p) =>
                  p.id !== productId ? p : { ...p, isVisibleOnOnlineOrder: current }
                ),
              }
        )
      );
    }
  }

  async function moveCategory(index: number, direction: "up" | "down") {
    const newCats = [...categories];
    const swapIdx = direction === "up" ? index - 1 : index + 1;
    if (swapIdx < 0 || swapIdx >= newCats.length) return;
    [newCats[index], newCats[swapIdx]] = [newCats[swapIdx], newCats[index]];
    const withOrder = newCats.map((c, i) => ({ ...c, displayOrder: i }));
    setCategories(withOrder);
    const res = await fetch(`/api/backoffice/${storeId}/catalog/categories`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: withOrder.map((c) => ({ id: c.id, displayOrder: c.displayOrder })),
      }),
    });
    if (!res.ok) {
      setCategories(categories);
      setError(`Reorder failed (${res.status})`);
    }
  }

  async function toggleOptionSoldOut(
    groupId: string,
    optionId: string,
    current: boolean
  ) {
    setModifierGroups((prev) =>
      prev.map((g) =>
        g.id !== groupId
          ? g
          : {
              ...g,
              options: g.options.map((o) =>
                o.id !== optionId ? o : { ...o, isSoldOut: !current }
              ),
            }
      )
    );
    const res = await fetch(
      `/api/backoffice/${storeId}/catalog/modifiers/${groupId}/options/${optionId}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isSoldOut: !current }),
      }
    );
    if (!res.ok) {
      setModifierGroups((prev) =>
        prev.map((g) =>
          g.id !== groupId
            ? g
            : {
                ...g,
                options: g.options.map((o) =>
                  o.id !== optionId ? o : { ...o, isSoldOut: current }
                ),
              }
        )
      );
    }
  }

  const soldOutCount = categories.reduce(
    (sum, c) => sum + c.products.filter((p) => p.isSoldOut).length,
    0
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Catalog Management</h1>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
          {error}
          <button onClick={() => setError(null)} className="ml-2 underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {(["products", "modifiers"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium capitalize ${
              tab === t
                ? "border-b-2 border-brand-600 text-brand-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "products" && (
        <div className="space-y-6">
          {/* Bulk restore */}
          <div className="flex items-center justify-between bg-white border border-gray-200 rounded-lg p-4">
            <div>
              <span className="font-medium text-gray-900">Sold-out products: </span>
              <span className="text-red-600 font-semibold">{soldOutCount}</span>
            </div>
            {soldOutCount > 0 && (
              <button
                onClick={handleBulkRestore}
                className="px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors"
              >
                Restore All Availability
              </button>
            )}
          </div>

          {/* Category reorder + products */}
          <div className="space-y-4">
            {categories.map((cat, catIdx) => (
              <div
                key={cat.id}
                className="bg-white border border-gray-200 rounded-lg overflow-hidden"
              >
                <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200">
                  <span className="font-semibold text-gray-900">{cat.name}</span>
                  <div className="flex gap-1">
                    <button
                      onClick={() => moveCategory(catIdx, "up")}
                      disabled={catIdx === 0}
                      className="p-1 rounded hover:bg-gray-200 disabled:opacity-30 text-gray-600 text-xs"
                    >
                      ↑
                    </button>
                    <button
                      onClick={() => moveCategory(catIdx, "down")}
                      disabled={catIdx === categories.length - 1}
                      className="p-1 rounded hover:bg-gray-200 disabled:opacity-30 text-gray-600 text-xs"
                    >
                      ↓
                    </button>
                  </div>
                </div>
                <div className="divide-y divide-gray-100">
                  {cat.products.map((product) => (
                    <div
                      key={product.id}
                      className="flex items-center justify-between px-4 py-3"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-gray-900">{product.name}</span>
                        {product.isSoldOut && <SoldOutBadge />}
                      </div>
                      <div className="flex items-center gap-4">
                        <label className="flex items-center gap-2 text-xs text-gray-500 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={!product.isSoldOut}
                            onChange={() =>
                              toggleProductSoldOut(cat.id, product.id, product.isSoldOut)
                            }
                            className="rounded"
                          />
                          Available
                        </label>
                        <label className="flex items-center gap-2 text-xs text-gray-500 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={product.isVisibleOnOnlineOrder}
                            onChange={() =>
                              toggleProductVisibility(
                                cat.id,
                                product.id,
                                product.isVisibleOnOnlineOrder
                              )
                            }
                            className="rounded"
                          />
                          Visible
                        </label>
                      </div>
                    </div>
                  ))}
                  {cat.products.length === 0 && (
                    <p className="px-4 py-3 text-sm text-gray-400">No products</p>
                  )}
                </div>
              </div>
            ))}
            {categories.length === 0 && (
              <p className="text-gray-400 text-sm">No categories found.</p>
            )}
          </div>
        </div>
      )}

      {tab === "modifiers" && (
        <div className="space-y-4">
          {modifierGroups.map((group) => (
            <div
              key={group.id}
              className="bg-white border border-gray-200 rounded-lg overflow-hidden"
            >
              <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                <span className="font-semibold text-gray-900">{group.name}</span>
              </div>
              <div className="divide-y divide-gray-100">
                {group.options.map((opt) => (
                  <div
                    key={opt.id}
                    className="flex items-center justify-between px-4 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-gray-900">{opt.name}</span>
                      {opt.isSoldOut && <SoldOutBadge />}
                    </div>
                    <label className="flex items-center gap-2 text-xs text-gray-500 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={!opt.isSoldOut}
                        onChange={() =>
                          toggleOptionSoldOut(group.id, opt.id, opt.isSoldOut)
                        }
                        className="rounded"
                      />
                      Available
                    </label>
                  </div>
                ))}
                {group.options.length === 0 && (
                  <p className="px-4 py-3 text-sm text-gray-400">No options</p>
                )}
              </div>
            </div>
          ))}
          {modifierGroups.length === 0 && (
            <p className="text-gray-400 text-sm">No modifier groups found.</p>
          )}
        </div>
      )}
    </div>
  );
}
