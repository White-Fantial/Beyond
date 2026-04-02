"use client";

import { useState } from "react";
import type { CatalogModifierGroup, CatalogModifierOption } from "@prisma/client";

type GroupWithOptions = CatalogModifierGroup & { modifierOptions: CatalogModifierOption[] };

interface Props {
  initialGroups: GroupWithOptions[];
}

export default function CatalogModifiersClient({ initialGroups }: Props) {
  const [groups, setGroups] = useState<GroupWithOptions[]>(initialGroups);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState<string | null>(null);

  if (groups.length === 0) {
    return <p className="text-gray-500">등록된 옵션 그룹이 없습니다.</p>;
  }

  function toggleExpand(groupId: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  }

  async function toggleSoldOut(optionId: string, groupId: string, current: boolean) {
    setSaving(optionId);
    try {
      const res = await fetch("/api/catalog/modifier-groups", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "toggleSoldOut", optionId, isSoldOut: !current }),
      });
      if (res.ok) {
        const { option } = await res.json();
        setGroups((prev) =>
          prev.map((g) =>
            g.id !== groupId
              ? g
              : {
                  ...g,
                  modifierOptions: g.modifierOptions.map((o) =>
                    o.id === option.id ? option : o
                  ),
                }
          )
        );
      }
    } finally {
      setSaving(null);
    }
  }

  return (
    <div className="space-y-2">
      {groups.map((group) => (
        <div key={group.id} className="rounded-lg border border-gray-200 bg-white">
          <button
            onClick={() => toggleExpand(group.id)}
            className="flex w-full items-center justify-between px-4 py-3 text-left"
          >
            <div>
              <span className="font-medium text-gray-900">{group.name}</span>
              <span className="ml-2 text-xs text-gray-400">
                {group.modifierOptions.length} more 옵션
              </span>
            </div>
            <span className="text-gray-400">{expanded.has(group.id) ? "▲" : "▼"}</span>
          </button>

          {expanded.has(group.id) && (
            <div className="border-t border-gray-100 px-4 pb-3 pt-2">
              {group.modifierOptions.length === 0 ? (
                <p className="text-sm text-gray-400">No modifiers found.</p>
              ) : (
                <ul className="space-y-1">
                  {group.modifierOptions.map((opt) => (
                    <li key={opt.id} className="flex items-center justify-between text-sm">
                      <span className={opt.isSoldOut ? "text-gray-400 line-through" : "text-gray-800"}>
                        {opt.name}
                        {opt.priceDeltaAmount > 0 && (
                          <span className="ml-1 text-gray-400">
                            +{(opt.priceDeltaAmount / 100).toFixed(2)}
                          </span>
                        )}
                      </span>
                      <button
                        disabled={saving === opt.id}
                        onClick={() => toggleSoldOut(opt.id, group.id, opt.isSoldOut)}
                        className={`rounded px-2 py-0.5 text-xs font-medium ${
                          opt.isSoldOut
                            ? "bg-red-100 text-red-700"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {saving === opt.id ? "Saving..." : opt.isSoldOut ? "Sold Out" : "Available"}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
