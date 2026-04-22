"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type {
  TenantModifierGroupRow,
  TenantProductModifierGroupRow,
} from "@/types/owner";

function formatPrice(amount: number) {
  if (amount === 0) return "Free";
  const sign = amount > 0 ? "+" : "";
  return `${sign}$${(Math.abs(amount) / 100000).toFixed(2)}`;
}

interface Props {
  tenantProductId: string;
  linkedGroups: TenantProductModifierGroupRow[];
  allGroups: TenantModifierGroupRow[];
}

export default function ProductModifierGroupSection({
  tenantProductId,
  linkedGroups: initialLinked,
  allGroups,
}: Props) {
  const router = useRouter();
  const [linked, setLinked] = useState<TenantProductModifierGroupRow[]>(initialLinked);
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const linkedIds = new Set(linked.map((l) => l.tenantModifierGroupId));
  const available = allGroups.filter((g) => !linkedIds.has(g.id) && g.isActive);

  async function handleLink() {
    if (!selectedGroupId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/owner/tenant-products/${tenantProductId}/modifiers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenantModifierGroupId: selectedGroupId,
          displayOrder: linked.length,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to link modifier group");
      setLinked((prev) => [...prev, json.data]);
      setSelectedGroupId("");
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleUnlink(tenantModifierGroupId: string, name: string) {
    if (!confirm(`Remove modifier group "${name}" from this product?`)) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/owner/tenant-products/${tenantProductId}/modifiers`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantModifierGroupId }),
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error ?? "Failed to remove modifier group");
      }
      setLinked((prev) => prev.filter((l) => l.tenantModifierGroupId !== tenantModifierGroupId));
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleMoveUp(index: number) {
    if (index === 0) return;
    const reordered = [...linked];
    [reordered[index - 1], reordered[index]] = [reordered[index], reordered[index - 1]];
    setLinked(reordered);
    await saveOrder(reordered);
  }

  async function handleMoveDown(index: number) {
    if (index === linked.length - 1) return;
    const reordered = [...linked];
    [reordered[index], reordered[index + 1]] = [reordered[index + 1], reordered[index]];
    setLinked(reordered);
    await saveOrder(reordered);
  }

  async function saveOrder(reordered: TenantProductModifierGroupRow[]) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/owner/tenant-products/${tenantProductId}/modifiers/reorder`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderedGroupIds: reordered.map((l) => l.tenantModifierGroupId),
        }),
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error ?? "Failed to reorder modifier groups");
      }
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      {error && (
        <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
          {error}
        </div>
      )}

      {linked.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-6 text-center text-sm text-gray-400">
          No modifier groups linked to this product yet.
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">Order</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">Group Name</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">Selection</th>
                <th className="text-center px-4 py-2.5 text-xs font-medium text-gray-500">Options</th>
                <th className="text-center px-4 py-2.5 text-xs font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {linked.map((l, idx) => (
                <>
                  <tr key={l.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2.5">
                      <div className="flex flex-col gap-0.5">
                        <button
                          onClick={() => handleMoveUp(idx)}
                          disabled={idx === 0 || loading}
                          className="text-gray-400 hover:text-gray-600 disabled:opacity-30 text-xs leading-none"
                          title="Move up"
                        >
                          ▲
                        </button>
                        <button
                          onClick={() => handleMoveDown(idx)}
                          disabled={idx === linked.length - 1 || loading}
                          className="text-gray-400 hover:text-gray-600 disabled:opacity-30 text-xs leading-none"
                          title="Move down"
                        >
                          ▼
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-2.5">
                      <button
                        onClick={() => setExpandedId(expandedId === l.id ? null : l.id)}
                        className="font-medium text-gray-900 hover:text-brand-700 text-left"
                      >
                        {l.modifierGroup.name}
                      </button>
                      {l.modifierGroup.isRequired && (
                        <span className="ml-2 text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">
                          Required
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-gray-500 text-xs">
                      {l.modifierGroup.selectionMin === 0 && !l.modifierGroup.selectionMax
                        ? "Any"
                        : `${l.modifierGroup.selectionMin}–${l.modifierGroup.selectionMax ?? "∞"}`}
                    </td>
                    <td className="px-4 py-2.5 text-center text-gray-500">
                      {l.modifierGroup.options.length}
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <button
                        onClick={() => handleUnlink(l.tenantModifierGroupId, l.modifierGroup.name)}
                        disabled={loading}
                        className="text-xs text-red-500 hover:text-red-700 font-medium disabled:opacity-50"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                  {expandedId === l.id && l.modifierGroup.options.length > 0 && (
                    <tr key={`${l.id}-options`}>
                      <td colSpan={5} className="px-8 py-2 bg-gray-50 border-b border-gray-100">
                        <div className="flex flex-wrap gap-2">
                          {l.modifierGroup.options.map((opt) => (
                            <span
                              key={opt.id}
                              className="text-xs bg-white border border-gray-200 rounded px-2 py-0.5 text-gray-700"
                            >
                              {opt.name}
                              {opt.priceDeltaAmount !== 0 && (
                                <span className="ml-1 text-gray-400">{formatPrice(opt.priceDeltaAmount)}</span>
                              )}
                              {opt.isDefault && (
                                <span className="ml-1 text-blue-500">★</span>
                              )}
                            </span>
                          ))}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Link a new modifier group */}
      {available.length > 0 && (
        <div className="flex gap-2 items-center">
          <select
            value={selectedGroupId}
            onChange={(e) => setSelectedGroupId(e.target.value)}
            className="flex-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
          >
            <option value="">— Select a modifier group to add —</option>
            {available.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name} ({g.options.length} options)
              </option>
            ))}
          </select>
          <button
            onClick={handleLink}
            disabled={loading || !selectedGroupId}
            className="px-4 py-1.5 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 disabled:opacity-50 transition-colors shrink-0"
          >
            Add
          </button>
        </div>
      )}
    </div>
  );
}
