"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { StoreCategorySelectionRow } from "@/types/owner";

interface Props {
  storeId: string;
  initialSelections: StoreCategorySelectionRow[];
}

export default function StoreCategorySelectionPanel({ storeId, initialSelections }: Props) {
  const router = useRouter();
  const [selections, setSelections] = useState<StoreCategorySelectionRow[]>(initialSelections);
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleToggle(tenantCategoryId: string, enabled: boolean) {
    setLoading(tenantCategoryId);
    setError(null);
    try {
      const res = await fetch(
        `/api/owner/stores/${storeId}/category-selections/${tenantCategoryId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isEnabled: enabled }),
        }
      );
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error ?? "Failed to update category");
      }
      setSelections((prev) =>
        prev.map((s) => (s.tenantCategoryId === tenantCategoryId ? { ...s, isEnabled: enabled } : s))
      );
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(null);
    }
  }

  async function handleMoveUp(index: number) {
    if (index === 0) return;
    const reordered = [...selections];
    [reordered[index - 1], reordered[index]] = [reordered[index], reordered[index - 1]];
    setSelections(reordered);
    await saveOrder(reordered);
  }

  async function handleMoveDown(index: number) {
    if (index === selections.length - 1) return;
    const reordered = [...selections];
    [reordered[index], reordered[index + 1]] = [reordered[index + 1], reordered[index]];
    setSelections(reordered);
    await saveOrder(reordered);
  }

  async function saveOrder(reordered: StoreCategorySelectionRow[]) {
    setLoading("reorder");
    setError(null);
    try {
      const res = await fetch(`/api/owner/stores/${storeId}/category-selections/reorder`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderedCategoryIds: reordered.map((s) => s.tenantCategoryId),
        }),
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error ?? "Failed to reorder categories");
      }
      // Update local overrides so UI reflects the new order
      setSelections((prev) =>
        prev.map((s, idx) => ({ ...s, displayOrderOverride: idx, effectiveDisplayOrder: idx }))
      );
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(null);
    }
  }

  async function handleResetOrder() {
    if (!confirm("Reset all category order overrides to the catalog default?")) return;
    // Clear displayOrderOverride for all by setting to null via individual PUTs
    setLoading("reorder");
    setError(null);
    try {
      await Promise.all(
        selections.map((s) =>
          fetch(`/api/owner/stores/${storeId}/category-selections/${s.tenantCategoryId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ displayOrderOverride: null }),
          })
        )
      );
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(null);
    }
  }

  const hasOverrides = selections.some((s) => s.displayOrderOverride !== null);

  return (
    <div className="space-y-3">
      {error && (
        <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
          {error}
        </div>
      )}

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
          <p className="text-xs text-gray-500">
            Toggle to enable/disable a category for this store. Use the arrows to reorder.
          </p>
          {hasOverrides && (
            <button
              onClick={handleResetOrder}
              disabled={loading === "reorder"}
              className="text-xs text-gray-500 hover:text-red-600 border border-gray-200 px-2.5 py-1 rounded hover:bg-red-50 disabled:opacity-50 transition-colors"
            >
              Reset Order
            </button>
          )}
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-center px-4 py-2.5 text-xs font-medium text-gray-500 w-16">Order</th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">Category Name</th>
              <th className="text-center px-4 py-2.5 text-xs font-medium text-gray-500">Enabled</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {selections.map((s, idx) => (
              <tr
                key={s.tenantCategoryId}
                className={`hover:bg-gray-50 ${!s.isEnabled ? "opacity-60" : ""}`}
              >
                <td className="px-4 py-2.5 text-center">
                  <div className="flex flex-col items-center gap-0.5">
                    <button
                      onClick={() => handleMoveUp(idx)}
                      disabled={idx === 0 || loading !== null}
                      className="text-gray-400 hover:text-gray-600 disabled:opacity-30 text-xs leading-none"
                      title="Move up"
                    >
                      ▲
                    </button>
                    <button
                      onClick={() => handleMoveDown(idx)}
                      disabled={idx === selections.length - 1 || loading !== null}
                      className="text-gray-400 hover:text-gray-600 disabled:opacity-30 text-xs leading-none"
                      title="Move down"
                    >
                      ▼
                    </button>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className="font-medium text-gray-900">{s.name}</span>
                  {s.displayOrderOverride !== null && (
                    <span className="ml-2 text-xs text-blue-500">(custom order)</span>
                  )}
                </td>
                <td className="px-4 py-3 text-center">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={s.isEnabled}
                      onChange={(e) => handleToggle(s.tenantCategoryId, e.target.checked)}
                      disabled={loading === s.tenantCategoryId}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-gray-200 peer-focus:ring-2 peer-focus:ring-brand-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-brand-600 peer-disabled:opacity-50" />
                  </label>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
