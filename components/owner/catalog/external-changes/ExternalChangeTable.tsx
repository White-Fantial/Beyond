"use client";

/**
 * ExternalChangeTable — filterable list of external catalog changes.
 */

import { useState } from "react";
import type { ExternalCatalogChangeDto, ExternalCatalogChangeKind, ExternalCatalogChangeStatus } from "@/types/catalog-external-changes";

interface Props {
  changes: ExternalCatalogChangeDto[];
  connectionId: string;
  storeId: string;
  onAcknowledge?: (id: string) => void;
  onIgnore?: (id: string) => void;
}

const KIND_COLORS: Record<ExternalCatalogChangeKind, string> = {
  CREATED: "bg-green-100 text-green-800",
  UPDATED: "bg-blue-100 text-blue-800",
  DELETED: "bg-red-100 text-red-800",
  RELINKED: "bg-orange-100 text-orange-800",
  STRUCTURE_UPDATED: "bg-purple-100 text-purple-800",
};

const STATUS_COLORS: Record<ExternalCatalogChangeStatus, string> = {
  OPEN: "bg-yellow-100 text-yellow-800",
  ACKNOWLEDGED: "bg-gray-100 text-gray-600",
  IGNORED: "bg-gray-50 text-gray-400",
  SUPERSEDED: "bg-gray-50 text-gray-400",
};

function Badge({ label, colorClass }: { label: string; colorClass: string }) {
  return (
    <span className={`inline-block text-xs font-semibold rounded px-2 py-0.5 ${colorClass}`}>
      {label}
    </span>
  );
}

export default function ExternalChangeTable({ changes, onAcknowledge, onIgnore }: Props) {
  const [expanded, setExpanded] = useState<string | null>(null);

  if (changes.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400 border rounded-lg">
        No external changes detected.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      <table className="min-w-full text-sm">
        <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
          <tr>
            <th className="px-4 py-3 text-left">Entity</th>
            <th className="px-4 py-3 text-left">Type</th>
            <th className="px-4 py-3 text-left">Change</th>
            <th className="px-4 py-3 text-left">Mapped To</th>
            <th className="px-4 py-3 text-left">Detected</th>
            <th className="px-4 py-3 text-left">Status</th>
            <th className="px-4 py-3 text-left">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {changes.map((c) => (
            <>
              <tr
                key={c.id}
                className="hover:bg-gray-50 cursor-pointer"
                onClick={() => setExpanded(expanded === c.id ? null : c.id)}
              >
                <td className="px-4 py-3 font-medium text-gray-900">
                  {c.summary?.replace(/^(Changed:|New|Missing).+?"|".*$/g, "").trim() || c.externalEntityId.slice(0, 12) + "…"}
                  <div className="text-xs text-gray-400 truncate max-w-[180px]">{c.externalEntityId}</div>
                </td>
                <td className="px-4 py-3 text-gray-600">{c.entityType}</td>
                <td className="px-4 py-3">
                  <Badge label={c.changeKind} colorClass={KIND_COLORS[c.changeKind]} />
                </td>
                <td className="px-4 py-3 text-gray-600 truncate max-w-[120px]">
                  {c.internalEntityId ? (
                    <span className="text-xs font-mono">{c.internalEntityId.slice(0, 8)}…</span>
                  ) : (
                    <span className="text-xs text-gray-300">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-gray-400 whitespace-nowrap">
                  {new Date(c.detectedAt).toLocaleDateString()}
                </td>
                <td className="px-4 py-3">
                  <Badge label={c.status} colorClass={STATUS_COLORS[c.status]} />
                </td>
                <td className="px-4 py-3 flex gap-2">
                  {c.status === "OPEN" && (
                    <>
                      <button
                        onClick={(e) => { e.stopPropagation(); onAcknowledge?.(c.id); }}
                        className="text-xs text-blue-600 hover:underline"
                      >
                        Ack
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); onIgnore?.(c.id); }}
                        className="text-xs text-gray-400 hover:underline"
                      >
                        Ignore
                      </button>
                    </>
                  )}
                </td>
              </tr>
              {expanded === c.id && c.fieldDiffs && c.fieldDiffs.length > 0 && (
                <tr key={`${c.id}-detail`} className="bg-gray-50">
                  <td colSpan={7} className="px-6 py-3">
                    <div className="text-xs text-gray-500 mb-1 font-semibold">Field Diffs</div>
                    <table className="text-xs w-full">
                      <thead>
                        <tr className="text-gray-400">
                          <th className="text-left pr-4 py-1">Field</th>
                          <th className="text-left pr-4 py-1">Previous</th>
                          <th className="text-left pr-4 py-1">Current</th>
                          <th className="text-left py-1">Type</th>
                        </tr>
                      </thead>
                      <tbody>
                        {c.fieldDiffs.map((f) => (
                          <tr key={f.id} className="border-t border-gray-100">
                            <td className="pr-4 py-1 font-mono text-gray-700">{f.fieldPath}</td>
                            <td className="pr-4 py-1 text-red-500">{JSON.stringify(f.previousValue)}</td>
                            <td className="pr-4 py-1 text-green-600">{JSON.stringify(f.currentValue)}</td>
                            <td className="py-1 text-gray-400">{f.changeType}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </td>
                </tr>
              )}
            </>
          ))}
        </tbody>
      </table>
    </div>
  );
}
