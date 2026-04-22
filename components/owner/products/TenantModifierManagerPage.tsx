"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { TenantModifierGroupRow, TenantModifierOptionRow } from "@/types/owner";

function formatPrice(amount: number) {
  if (amount === 0) return "Free";
  const sign = amount > 0 ? "+" : "";
  return `${sign}$${(Math.abs(amount) / 100000).toFixed(2)}`;
}

interface Props {
  initialGroups: TenantModifierGroupRow[];
}

export default function TenantModifierManagerPage({ initialGroups }: Props) {
  const router = useRouter();
  const [groups, setGroups] = useState<TenantModifierGroupRow[]>(initialGroups);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // New group form
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupMin, setNewGroupMin] = useState(0);
  const [newGroupMax, setNewGroupMax] = useState<string>("");
  const [newGroupRequired, setNewGroupRequired] = useState(false);

  // Edit group
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [editGroupName, setEditGroupName] = useState("");

  // New option form (per group)
  const [addingOptionTo, setAddingOptionTo] = useState<string | null>(null);
  const [newOptionName, setNewOptionName] = useState("");
  const [newOptionPrice, setNewOptionPrice] = useState("");
  const [newOptionDefault, setNewOptionDefault] = useState(false);

  async function handleAddGroup(e: React.FormEvent) {
    e.preventDefault();
    if (!newGroupName.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/owner/tenant-modifiers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newGroupName.trim(),
          selectionMin: newGroupMin,
          selectionMax: newGroupMax !== "" ? Number(newGroupMax) : null,
          isRequired: newGroupRequired,
          displayOrder: groups.length,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to create modifier group");
      setGroups((prev) => [...prev, json.data]);
      setNewGroupName("");
      setNewGroupMin(0);
      setNewGroupMax("");
      setNewGroupRequired(false);
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveGroupEdit(groupId: string) {
    if (!editGroupName.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/owner/tenant-modifiers/${groupId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editGroupName.trim() }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to update modifier group");
      setGroups((prev) => prev.map((g) => (g.id === groupId ? { ...g, name: json.data.name } : g)));
      setEditingGroupId(null);
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteGroup(groupId: string, name: string) {
    if (!confirm(`Delete modifier group "${name}"? This will remove it from all linked products.`)) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/owner/tenant-modifiers/${groupId}`, { method: "DELETE" });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error ?? "Failed to delete modifier group");
      }
      setGroups((prev) => prev.filter((g) => g.id !== groupId));
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleAddOption(groupId: string) {
    if (!newOptionName.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const priceDeltaAmount = newOptionPrice !== ""
        ? Math.round(parseFloat(newOptionPrice) * 100000)
        : 0;
      const res = await fetch(`/api/owner/tenant-modifiers/${groupId}/options`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newOptionName.trim(),
          priceDeltaAmount,
          isDefault: newOptionDefault,
          displayOrder: (groups.find((g) => g.id === groupId)?.options.length ?? 0),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to create option");
      const newOption: TenantModifierOptionRow = json.data;
      setGroups((prev) =>
        prev.map((g) =>
          g.id === groupId ? { ...g, options: [...g.options, newOption] } : g
        )
      );
      setNewOptionName("");
      setNewOptionPrice("");
      setNewOptionDefault(false);
      setAddingOptionTo(null);
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteOption(groupId: string, optionId: string, name: string) {
    if (!confirm(`Delete option "${name}"?`)) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/owner/tenant-modifiers/${groupId}/options/${optionId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error ?? "Failed to delete option");
      }
      setGroups((prev) =>
        prev.map((g) =>
          g.id === groupId ? { ...g, options: g.options.filter((o) => o.id !== optionId) } : g
        )
      );
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Modifier group list */}
      {groups.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-10 text-center text-gray-400 text-sm">
          No modifier groups yet. Add the first one below.
        </div>
      ) : (
        <div className="space-y-2">
          {groups.map((group) => (
            <div key={group.id} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              {/* Group header */}
              <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  {editingGroupId === group.id ? (
                    <input
                      className="flex-1 max-w-xs rounded border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                      value={editGroupName}
                      onChange={(e) => setEditGroupName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleSaveGroupEdit(group.id);
                        if (e.key === "Escape") setEditingGroupId(null);
                      }}
                      autoFocus
                    />
                  ) : (
                    <button
                      onClick={() => setExpandedId(expandedId === group.id ? null : group.id)}
                      className="flex items-center gap-2 text-left"
                    >
                      <span className="text-sm font-semibold text-gray-800">{group.name}</span>
                      <span className="text-xs text-gray-400">
                        {group.options.length} option{group.options.length !== 1 ? "s" : ""}
                      </span>
                      {group.isRequired && (
                        <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">Required</span>
                      )}
                      <span className="text-xs text-gray-400">
                        {group.selectionMin === 0 && !group.selectionMax
                          ? "Any"
                          : `${group.selectionMin}–${group.selectionMax ?? "∞"}`}
                      </span>
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {editingGroupId === group.id ? (
                    <>
                      <button
                        onClick={() => handleSaveGroupEdit(group.id)}
                        disabled={loading}
                        className="text-xs px-3 py-1 bg-brand-600 text-white rounded hover:bg-brand-700 disabled:opacity-50 transition-colors"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingGroupId(null)}
                        className="text-xs px-3 py-1 border border-gray-200 rounded text-gray-500 hover:bg-gray-50 transition-colors"
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => { setEditingGroupId(group.id); setEditGroupName(group.name); setError(null); }}
                        className="text-xs text-brand-600 hover:text-brand-800 font-medium"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteGroup(group.id, group.name)}
                        disabled={loading}
                        className="text-xs text-red-500 hover:text-red-700 font-medium disabled:opacity-50"
                      >
                        Delete
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Options (collapsed by default, expand on click) */}
              {expandedId === group.id && (
                <div>
                  {group.options.length === 0 ? (
                    <div className="px-4 py-3 text-sm text-gray-400">No options yet.</div>
                  ) : (
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 border-b border-gray-100">
                        <tr>
                          <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">Option</th>
                          <th className="text-right px-4 py-2 text-xs font-medium text-gray-500">Price Delta</th>
                          <th className="text-center px-4 py-2 text-xs font-medium text-gray-500">Default</th>
                          <th className="text-center px-4 py-2 text-xs font-medium text-gray-500">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {group.options.map((opt) => (
                          <tr key={opt.id} className="hover:bg-gray-50">
                            <td className="px-4 py-2.5 text-gray-800">{opt.name}</td>
                            <td className="px-4 py-2.5 text-right text-gray-600">{formatPrice(opt.priceDeltaAmount)}</td>
                            <td className="px-4 py-2.5 text-center">
                              {opt.isDefault && (
                                <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">Default</span>
                              )}
                            </td>
                            <td className="px-4 py-2.5 text-center">
                              <button
                                onClick={() => handleDeleteOption(group.id, opt.id, opt.name)}
                                disabled={loading}
                                className="text-xs text-red-500 hover:text-red-700 disabled:opacity-50"
                              >
                                Delete
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}

                  {/* Add option inline */}
                  {addingOptionTo === group.id ? (
                    <div className="px-4 py-3 border-t border-gray-100 bg-gray-50 space-y-2">
                      <div className="flex gap-2 flex-wrap">
                        <input
                          type="text"
                          value={newOptionName}
                          onChange={(e) => setNewOptionName(e.target.value)}
                          placeholder="Option name"
                          className="flex-1 min-w-32 rounded border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                        />
                        <input
                          type="number"
                          value={newOptionPrice}
                          onChange={(e) => setNewOptionPrice(e.target.value)}
                          placeholder="Price delta ($)"
                          className="w-32 rounded border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                          step="0.01"
                        />
                        <label className="flex items-center gap-1 text-sm text-gray-600">
                          <input
                            type="checkbox"
                            checked={newOptionDefault}
                            onChange={(e) => setNewOptionDefault(e.target.checked)}
                            className="rounded"
                          />
                          Default
                        </label>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleAddOption(group.id)}
                          disabled={loading || !newOptionName.trim()}
                          className="px-3 py-1.5 bg-brand-600 text-white text-xs font-medium rounded hover:bg-brand-700 disabled:opacity-50 transition-colors"
                        >
                          Add Option
                        </button>
                        <button
                          onClick={() => { setAddingOptionTo(null); setNewOptionName(""); setNewOptionPrice(""); setNewOptionDefault(false); }}
                          className="px-3 py-1.5 border border-gray-200 text-xs text-gray-500 rounded hover:bg-gray-50 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="px-4 py-2 border-t border-gray-100">
                      <button
                        onClick={() => { setAddingOptionTo(group.id); setError(null); }}
                        className="text-xs text-brand-600 hover:text-brand-800 font-medium"
                      >
                        + Add Option
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add new group form */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
          <h3 className="text-sm font-semibold text-gray-700">Add Modifier Group</h3>
        </div>
        <form onSubmit={handleAddGroup} className="px-4 py-4 space-y-3">
          <div className="flex gap-2 flex-wrap">
            <input
              type="text"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              placeholder="Group name (e.g. Size, Add-ons)"
              className="flex-1 min-w-48 rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <div className="flex gap-4 flex-wrap items-center">
            <label className="flex items-center gap-1.5 text-sm text-gray-600">
              Min:
              <input
                type="number"
                min={0}
                value={newGroupMin}
                onChange={(e) => setNewGroupMin(Number(e.target.value))}
                className="w-16 rounded border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </label>
            <label className="flex items-center gap-1.5 text-sm text-gray-600">
              Max:
              <input
                type="number"
                min={1}
                value={newGroupMax}
                onChange={(e) => setNewGroupMax(e.target.value)}
                placeholder="∞"
                className="w-16 rounded border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </label>
            <label className="flex items-center gap-1.5 text-sm text-gray-600">
              <input
                type="checkbox"
                checked={newGroupRequired}
                onChange={(e) => setNewGroupRequired(e.target.checked)}
                className="rounded"
              />
              Required
            </label>
            <button
              type="submit"
              disabled={loading || !newGroupName.trim()}
              className="px-4 py-1.5 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 disabled:opacity-50 transition-colors"
            >
              + Add Group
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
