"use client";

import { useState } from "react";
import type { CatalogProduct } from "@prisma/client";

interface CategoryGroup {
  categoryId: string;
  categoryName: string;
  products: CatalogProduct[];
}

interface Props {
  initialGroups: CategoryGroup[];
}

export default function InventoryClient({ initialGroups }: Props) {
  const [groups, setGroups] = useState<CategoryGroup[]>(initialGroups);
  const [saving, setSaving] = useState<string | null>(null);

  const totalProducts = groups.reduce((sum, g) => sum + g.products.length, 0);
  const soldOutCount = groups.reduce(
    (sum, g) => sum + g.products.filter((p) => p.isSoldOut).length,
    0
  );

  if (totalProducts === 0) {
    return <p className="text-gray-500">등록된 No products found.</p>;
  }

  async function toggleSoldOut(productId: string, categoryId: string, current: boolean) {
    setSaving(productId);
    try {
      const res = await fetch("/api/catalog/products", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "toggleSoldOut", productId, isSoldOut: !current }),
      });
      if (res.ok) {
        const { product } = await res.json();
        setGroups((prev) =>
          prev.map((g) =>
            g.categoryId !== categoryId
              ? g
              : {
                  ...g,
                  products: g.products.map((p) => (p.id === product.id ? product : p)),
                }
          )
        );
      }
    } finally {
      setSaving(null);
    }
  }

  return (
    <div className="space-y-1">
      <div className="mb-4 flex items-center gap-4 text-sm text-gray-500">
        <span>All {totalProducts} more 상품</span>
        {soldOutCount > 0 ? (
          <span className="rounded-full bg-red-100 px-2 py-0.5 text-red-700 font-medium">
            Sold Out {soldOutCount} more
          </span>
        ) : (
          <span className="rounded-full bg-green-100 px-2 py-0.5 text-green-700 font-medium">
            All Available
          </span>
        )}
      </div>

      {groups.map((group) => {
        const groupSoldOut = group.products.filter((p) => p.isSoldOut).length;
        return (
          <div key={group.categoryId} className="rounded-lg border border-gray-200 bg-white">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-gray-800">{group.categoryName}</span>
                <span className="text-xs text-gray-400">{group.products.length} more 상품</span>
              </div>
              {groupSoldOut > 0 && (
                <span className="text-xs text-red-600 font-medium">Sold Out {groupSoldOut} more</span>
              )}
            </div>

            <ul className="divide-y divide-gray-50">
              {group.products.map((product) => (
                <li
                  key={product.id}
                  className="flex items-center justify-between px-4 py-3"
                >
                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-sm font-medium truncate ${
                        product.isSoldOut ? "text-gray-400 line-through" : "text-gray-900"
                      }`}
                    >
                      {product.onlineName ?? product.name}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {(product.basePriceAmount / 100).toFixed(2)} {product.currency}
                    </p>
                  </div>
                  <button
                    disabled={saving === product.id}
                    onClick={() =>
                      toggleSoldOut(product.id, group.categoryId, product.isSoldOut)
                    }
                    className={`ml-4 shrink-0 rounded px-3 py-1 text-xs font-semibold transition-colors ${
                      product.isSoldOut
                        ? "bg-red-100 text-red-700 hover:bg-red-200"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    {saving === product.id
                      ? "Saving..."
                      : product.isSoldOut
                      ? "Sold Out"
                      : "Available"}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
