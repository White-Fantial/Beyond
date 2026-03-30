"use client";

import { useState } from "react";
import type { CatalogCategory } from "@prisma/client";

interface Props {
  initialCategories: CatalogCategory[];
}

export default function CatalogCategoriesClient({ initialCategories }: Props) {
  const [categories, setCategories] = useState<CatalogCategory[]>(initialCategories);
  const [saving, setSaving] = useState<string | null>(null);

  if (categories.length === 0) {
    return <p className="text-gray-500">등록된 카테고리가 없습니다.</p>;
  }

  async function toggleVisibility(categoryId: string, current: boolean) {
    setSaving(categoryId);
    try {
      const res = await fetch("/api/catalog/categories", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update",
          categoryId,
          isVisibleOnOnlineOrder: !current,
        }),
      });
      if (res.ok) {
        const { category } = await res.json();
        setCategories((prev) => prev.map((c) => (c.id === category.id ? category : c)));
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
            <th className="px-4 py-2 text-left font-medium text-gray-500">순서</th>
            <th className="px-4 py-2 text-left font-medium text-gray-500">카테고리명</th>
            <th className="px-4 py-2 text-left font-medium text-gray-500">온라인 노출</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 bg-white">
          {categories.map((cat) => (
            <tr key={cat.id}>
              <td className="px-4 py-2 text-gray-500">{cat.displayOrder}</td>
              <td className="px-4 py-2 font-medium text-gray-900">{cat.name}</td>
              <td className="px-4 py-2">
                <button
                  disabled={saving === cat.id}
                  onClick={() => toggleVisibility(cat.id, cat.isVisibleOnOnlineOrder)}
                  className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${
                    cat.isVisibleOnOnlineOrder
                      ? "bg-green-100 text-green-800"
                      : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {saving === cat.id ? "저장 중..." : cat.isVisibleOnOnlineOrder ? "노출" : "숨김"}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
