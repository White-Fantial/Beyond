"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { StoreModifierGroupSelectionRow } from "@/types/owner";
import { formatPriceDelta, formatSelectionRange } from "@/lib/utils/modifier-format";

interface Props {
  storeId: string;
  initialSelections: StoreModifierGroupSelectionRow[];
}

export default function StoreModifierSelectionPanel({ storeId, initialSelections }: Props) {
  const router = useRouter();
  const [selections, setSelections] = useState<StoreModifierGroupSelectionRow[]>(initialSelections);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleToggle(tenantModifierGroupId: string, enabled: boolean) {
    setLoading(tenantModifierGroupId);
    setError(null);
    try {
      const res = await fetch(
        `/api/owner/stores/${storeId}/modifier-selections/${tenantModifierGroupId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isEnabled: enabled }),
        }
      );
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error ?? "Failed to update modifier group");
      }
      setSelections((prev) =>
        prev.map((s) =>
          s.tenantModifierGroupId === tenantModifierGroupId ? { ...s, isEnabled: enabled } : s
        )
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

  async function saveOrder(reordered: StoreModifierGroupSelectionRow[]) {
    setLoading("reorder");
    setError(null);
    try {
      const res = await fetch(`/api/owner/stores/${storeId}/modifier-selections/reorder`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderedGroupIds: reordered.map((s) => s.tenantModifierGroupId),
        }),
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error ?? "Failed to reorder modifier groups");
      }
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
    if (!confirm("Reset all modifier group order overrides to the catalog default?")) return;
    setLoading("reorder");
    setError(null);
    try {
      await Promise.all(
        selections.map((s) =>
          fetch(`/api/owner/stores/${storeId}/modifier-selections/${s.tenantModifierGroupId}`, {
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

      <div className="space-y-2">
        <div className="flex items-center justify-end">
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

        {selections.map((s, idx) => (
          <div
            key={s.tenantModifierGroupId}
            className={`bg-white rounded-lg border border-gray-200 overflow-hidden ${!s.isEnabled ? "opacity-60" : ""}`}
          >
            <div className="px-4 py-3 flex items-center gap-3">
              {/* Order controls */}
              <div className="flex flex-col gap-0.5 shrink-0">
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

              {/* Enable toggle */}
              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={s.isEnabled}
                  onChange={(e) => handleToggle(s.tenantModifierGroupId, e.target.checked)}
                  disabled={loading === s.tenantModifierGroupId}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-gray-200 peer-focus:ring-2 peer-focus:ring-brand-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-brand-600 peer-disabled:opacity-50" />
              </label>

              {/* Group info */}
              <button
                onClick={() => setExpandedId(expandedId === s.tenantModifierGroupId ? null : s.tenantModifierGroupId)}
                className="flex-1 text-left min-w-0"
              >
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold text-gray-800">{s.name}</span>
                  {s.isRequired && (
                    <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">Required</span>
                  )}
                  <span className="text-xs text-gray-400">
                    {formatSelectionRange(s.selectionMin, s.selectionMax)}
                  </span>
                  <span className="text-xs text-gray-400">
                    {s.options.length} option{s.options.length !== 1 ? "s" : ""}
                  </span>
                  {s.displayOrderOverride !== null && (
                    <span className="text-xs text-blue-500">(custom order)</span>
                  )}
                </div>
              </button>
            </div>

            {/* Options (read-only, shown when expanded) */}
            {expandedId === s.tenantModifierGroupId && s.options.length > 0 && (
              <div className="border-t border-gray-100 divide-y divide-gray-100">
                {s.options.map((opt) => (
                  <div key={opt.id} className="flex items-center gap-3 px-8 py-2 text-sm">
                    <span className="flex-1 text-gray-700">{opt.name}</span>
                    <span className="text-gray-400 text-xs">{formatPriceDelta(opt.priceDeltaAmount)}</span>
                    {opt.isDefault && (
                      <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">Default</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
