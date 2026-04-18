"use client";

/**
 * MappingTable — displays a list of catalog entity mappings with actions.
 */

import type { MappingWithNames } from "@/types/catalog-mapping";
import { MAPPING_SOURCE_LABELS } from "@/lib/catalog/mapping-status";
import MappingStatusBadge from "./MappingStatusBadge";
import MappingActions from "./MappingActions";
import type { CatalogMappingSource } from "@/lib/catalog/mapping-status";

interface Props {
  mappings: MappingWithNames[];
}

export default function MappingTable({ mappings }: Props) {
  if (mappings.length === 0) {
    return (
      <p className="text-sm text-gray-500 py-6 text-center">
        No mappings found for the selected filters.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 text-xs text-gray-500 border-b border-gray-200">
          <tr>
            <th className="text-left px-4 py-2 font-medium">External Entity</th>
            <th className="text-left px-4 py-2 font-medium">Internal Entity</th>
            <th className="text-left px-4 py-2 font-medium">Status</th>
            <th className="text-left px-4 py-2 font-medium">Confidence</th>
            <th className="text-left px-4 py-2 font-medium">Source</th>
            <th className="text-left px-4 py-2 font-medium">Match Reason</th>
            <th className="text-left px-4 py-2 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {mappings.map((m) => (
            <tr key={m.id} className="hover:bg-gray-50">
              <td className="px-4 py-3">
                <div className="font-medium text-gray-900">{m.externalEntityName ?? m.externalEntityId}</div>
                <div className="text-xs text-gray-400">{m.externalEntityType} · {m.externalEntityId}</div>
              </td>
              <td className="px-4 py-3">
                {m.status === "UNMATCHED" ? (
                  <span className="text-orange-500 italic text-xs">No match found</span>
                ) : (
                  <>
                    <div className="font-medium text-gray-900">{m.internalEntityName ?? m.internalEntityId}</div>
                    <div className="text-xs text-gray-400">{m.internalEntityType} · {m.internalEntityId}</div>
                  </>
                )}
              </td>
              <td className="px-4 py-3">
                <MappingStatusBadge status={m.status} />
              </td>
              <td className="px-4 py-3 text-gray-600">
                {m.confidenceScore !== null
                  ? `${Math.round(m.confidenceScore * 100)}%`
                  : "—"}
              </td>
              <td className="px-4 py-3 text-gray-500 text-xs">
                {MAPPING_SOURCE_LABELS[m.source as CatalogMappingSource] ?? m.source}
              </td>
              <td className="px-4 py-3 text-gray-500 text-xs max-w-xs truncate">
                {m.matchReason ?? "—"}
              </td>
              <td className="px-4 py-3">
                <MappingActions mapping={m} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
