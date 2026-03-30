"use client";

import { useState } from "react";
import type { CatalogProduct } from "@prisma/client";

interface Props {
  initialProducts: CatalogProduct[];
}

export default function CatalogProductsClient({ initialProducts }: Props) {
  const [products, setProducts] = useState<CatalogProduct[]>(initialProducts);
  const [saving, setSaving] = useState<string | null>(null);

  if (products.length === 0) {
    return <p className="text-gray-500">등록된 상품이 없습니다.</p>;
  }

  async function toggleVisibility(productId: string, current: boolean) {
    setSaving(productId);
    try {
      const res = await fetch("/api/catalog/products", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, isVisibleOnOnlineOrder: !current }),
      });
      if (res.ok) {
        const { product } = await res.json();
        setProducts((prev) => prev.map((p) => (p.id === product.id ? product : p)));
      }
    } finally {
      setSaving(null);
    }
  }

  async function toggleFeatured(productId: string, current: boolean) {
    setSaving(productId);
    try {
      const res = await fetch("/api/catalog/products", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, isFeatured: !current }),
      });
      if (res.ok) {
        const { product } = await res.json();
        setProducts((prev) => prev.map((p) => (p.id === product.id ? product : p)));
      }
    } finally {
      setSaving(null);
    }
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200 text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-2 text-left font-medium text-gray-500">상품명</th>
            <th className="px-4 py-2 text-right font-medium text-gray-500">가격</th>
            <th className="px-4 py-2 text-left font-medium text-gray-500">온라인 노출</th>
            <th className="px-4 py-2 text-left font-medium text-gray-500">추천</th>
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
                  disabled={saving === product.id}
                  onClick={() => toggleVisibility(product.id, product.isVisibleOnOnlineOrder)}
                  className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${
                    product.isVisibleOnOnlineOrder
                      ? "bg-green-100 text-green-800"
                      : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {saving === product.id ? "저장 중..." : product.isVisibleOnOnlineOrder ? "노출" : "숨김"}
                </button>
              </td>
              <td className="px-4 py-2">
                <button
                  disabled={saving === product.id}
                  onClick={() => toggleFeatured(product.id, product.isFeatured)}
                  className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${
                    product.isFeatured
                      ? "bg-yellow-100 text-yellow-800"
                      : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {product.isFeatured ? "추천" : "일반"}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
