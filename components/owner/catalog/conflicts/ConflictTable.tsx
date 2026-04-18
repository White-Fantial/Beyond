"use client";

/**
 * ConflictTable — filterable list of catalog conflicts with action buttons.
 */

import { useState } from "react";
import type {
  CatalogConflictDto,
  CatalogConflictType,
  CatalogConflictStatus,
  CatalogConflictResolutionStrategy,
} from "@/types/catalog-conflicts";

interface Props {
  conflicts: CatalogConflictDto[];
  connectionId: string;
  storeId: string;
}

const CONFLICT_TYPE_COLORS: Record<CatalogConflictType, string> = {
  FIELD_VALUE_CONFLICT:    "bg-blue-100 text-blue-800",
  STRUCTURE_CONFLICT:      "bg-purple-100 text-purple-800",
  MISSING_ON_EXTERNAL:     "bg-orange-100 text-orange-800",
  MISSING_ON_INTERNAL:     "bg-red-100 text-red-800",
  PARENT_RELATION_CONFLICT: "bg-yellow-100 text-yellow-800",
  UNKNOWN_CONFLICT:        "bg-gray-100 text-gray-600",
};

const STATUS_COLORS: Record<CatalogConflictStatus, string> = {
  OPEN:       "bg-red-100 text-red-800",
  IN_REVIEW:  "bg-yellow-100 text-yellow-800",
  RESOLVED:   "bg-green-100 text-green-800",
  IGNORED:    "bg-gray-100 text-gray-500",
  SUPERSEDED: "bg-gray-50 text-gray-400",
};

function Badge({ label, colorClass }: { label: string; colorClass: string }) {
  return (
    <span className={`inline-block text-xs font-semibold rounded px-2 py-0.5 ${colorClass}`}>
      {label.replace(/_/g, " ")}
    </span>
  );
}

function FieldDiffRow({ field }: { field: CatalogConflictDto["conflictFields"] extends Array<infer T> ? T : never }) {
  return (
    <tr className="bg-gray-50 border-t border-gray-100">
      <td colSpan={7} className="px-6 py-3">
        <div className="flex flex-wrap gap-6 text-xs font-mono">
          <div>
            <span className="text-gray-400 mr-1">field:</span>
            <span className="font-semibold">{field.fieldPath}</span>
          </div>
          {field.baselineValue !== null && field.baselineValue !== undefined && (
            <div>
              <span className="text-gray-400 mr-1">baseline:</span>
              <span>{JSON.stringify(field.baselineValue)}</span>
            </div>
          )}
          <div>
            <span className="text-blue-500 mr-1">internal:</span>
            <span>{JSON.stringify(field.internalValue)}</span>
          </div>
          <div>
            <span className="text-orange-500 mr-1">external:</span>
            <span>{JSON.stringify(field.externalValue)}</span>
          </div>
        </div>
      </td>
    </tr>
  );
}

export default function ConflictTable({ conflicts }: Props) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [pending, setPending]   = useState<string | null>(null);

  if (conflicts.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400 border rounded-lg">
        No conflicts found.
      </div>
    );
  }

  async function doAction(
    conflictId: string,
    endpoint: string,
    body: Record<string, string> = {}
  ) {
    setPending(conflictId);
    try {
      await fetch(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      // Reload page to reflect updated status
      window.location.reload();
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      <table className="min-w-full text-sm">
        <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
          <tr>
            <th className="px-4 py-3 text-left">Internal Entity</th>
            <th className="px-4 py-3 text-left">Type</th>
            <th className="px-4 py-3 text-left">Conflict</th>
            <th className="px-4 py-3 text-left">Fields</th>
            <th className="px-4 py-3 text-left">Status</th>
            <th className="px-4 py-3 text-left">Detected</th>
            <th className="px-4 py-3 text-left">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {conflicts.map((c) => (
            <>
              <tr
                key={c.id}
                className="hover:bg-gray-50 cursor-pointer"
                onClick={() => setExpanded(expanded === c.id ? null : c.id)}
              >
                <td className="px-4 py-3 font-medium text-gray-900">
                  <div className="text-xs text-gray-400">{c.internalEntityType}</div>
                  <div className="truncate max-w-[180px]">{c.internalEntityId}</div>
                  {c.externalEntityId && (
                    <div className="text-xs text-gray-400 truncate">ext: {c.externalEntityId}</div>
                  )}
                </td>
                <td className="px-4 py-3">
                  <Badge label={c.scope} colorClass="bg-gray-100 text-gray-600" />
                </td>
                <td className="px-4 py-3">
                  <Badge label={c.conflictType} colorClass={CONFLICT_TYPE_COLORS[c.conflictType]} />
                  {c.summary && (
                    <div className="text-xs text-gray-400 mt-1 max-w-[220px] truncate">{c.summary}</div>
                  )}
                </td>
                <td className="px-4 py-3 text-center">
                  <span className="text-xs font-mono bg-gray-100 px-1.5 py-0.5 rounded">
                    {c.conflictFields?.length ?? 0}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <Badge label={c.status} colorClass={STATUS_COLORS[c.status]} />
                </td>
                <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                  {new Date(c.detectedAt).toLocaleString()}
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-1.5 flex-wrap" onClick={(e) => e.stopPropagation()}>
                    {c.status === "OPEN" && (
                      <button
                        onClick={() => doAction(c.id, `/api/catalog/conflicts/${c.id}/start-review`)}
                        disabled={pending === c.id}
                        className="text-xs px-2 py-1 rounded bg-yellow-100 text-yellow-800 hover:bg-yellow-200 disabled:opacity-50"
                      >
                        Review
                      </button>
                    )}
                    {(c.status === "OPEN" || c.status === "IN_REVIEW") && (
                      <>
                        <button
                          onClick={() => doAction(c.id, `/api/catalog/conflicts/${c.id}/resolve`, { resolutionStrategy: "KEEP_INTERNAL" satisfies CatalogConflictResolutionStrategy })}
                          disabled={pending === c.id}
                          className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-800 hover:bg-blue-200 disabled:opacity-50"
                        >
                          Keep Internal
                        </button>
                        <button
                          onClick={() => doAction(c.id, `/api/catalog/conflicts/${c.id}/resolve`, { resolutionStrategy: "ACCEPT_EXTERNAL" satisfies CatalogConflictResolutionStrategy })}
                          disabled={pending === c.id}
                          className="text-xs px-2 py-1 rounded bg-orange-100 text-orange-800 hover:bg-orange-200 disabled:opacity-50"
                        >
                          Accept External
                        </button>
                        <button
                          onClick={() => doAction(c.id, `/api/catalog/conflicts/${c.id}/ignore`)}
                          disabled={pending === c.id}
                          className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-50"
                        >
                          Ignore
                        </button>
                      </>
                    )}
                    {c.status === "RESOLVED" && (
                      <span className="text-xs text-gray-400">
                        {c.resolutionStrategy?.replace(/_/g, " ")}
                      </span>
                    )}
                  </div>
                </td>
              </tr>
              {expanded === c.id && (c.conflictFields?.length ?? 0) > 0 && (
                <>
                  <tr className="bg-blue-50">
                    <td colSpan={7} className="px-6 py-1 text-xs font-semibold text-blue-600 uppercase tracking-wide">
                      Field-level conflict details
                    </td>
                  </tr>
                  {c.conflictFields!.map((f) => (
                    <FieldDiffRow key={f.id} field={f} />
                  ))}
                  <tr className="bg-blue-50">
                    <td colSpan={7} className="px-6 py-2 text-xs text-blue-500">
                      Why is this a conflict? Both the Beyond catalog and the external channel changed the same field(s) differently after the last sync point.
                    </td>
                  </tr>
                </>
              )}
            </>
          ))}
        </tbody>
      </table>
    </div>
  );
}
