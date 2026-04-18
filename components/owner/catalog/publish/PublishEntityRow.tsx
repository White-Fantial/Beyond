"use client";

/**
 * PublishEntityRow — a single entity row in the publish control table.
 *
 * Shows:
 *   - Internal entity name and type
 *   - Mapping status
 *   - Last publish status
 *   - Action buttons (Create / Update / Archive / Unarchive)
 *
 * Action availability:
 *   - No active mapping → only CREATE enabled
 *   - Active mapping   → UPDATE / ARCHIVE enabled; CREATE disabled
 *   - Broken mapping   → all publish actions disabled with explanation
 */

import type { CatalogPublishAction } from "@/types/catalog-publish";
import type { CatalogMappingStatus } from "@/types/catalog-mapping";
import PublishStatusBadge from "./PublishStatusBadge";

export interface PublishEntityRowData {
  internalEntityId: string;
  internalEntityType: string;
  internalEntityName: string | null;
  mappingId: string | null;
  mappingStatus: CatalogMappingStatus | null;
  externalEntityId: string | null;
  lastPublishStatus: string | null;
  lastPublishedAt: Date | null;
}

interface Props {
  row: PublishEntityRowData;
  onAction: (entityId: string, entityType: string, action: CatalogPublishAction) => void;
  isLoading?: boolean;
}

export default function PublishEntityRow({ row, onAction, isLoading = false }: Props) {
  const hasActiveMapping = row.mappingStatus === "ACTIVE";
  const hasBrokenMapping = row.mappingStatus === "BROKEN";

  const btn = (label: string, action: CatalogPublishAction, enabled: boolean) => (
    <button
      key={action}
      disabled={!enabled || isLoading}
      onClick={() => enabled && !isLoading && onAction(row.internalEntityId, row.internalEntityType, action)}
      className={`text-xs px-2 py-1 rounded border ${
        enabled && !isLoading
          ? "border-indigo-300 text-indigo-700 hover:bg-indigo-50 cursor-pointer"
          : "border-gray-200 text-gray-300 cursor-not-allowed"
      }`}
    >
      {label}
    </button>
  );

  return (
    <tr className="hover:bg-gray-50">
      <td className="px-4 py-2 text-sm font-medium text-gray-800">{row.internalEntityName ?? row.internalEntityId}</td>
      <td className="px-4 py-2 text-xs text-gray-500 font-mono">{row.internalEntityType}</td>
      <td className="px-4 py-2 text-xs">
        {row.mappingStatus ? (
          <span
            className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
              row.mappingStatus === "ACTIVE"
                ? "bg-green-100 text-green-700"
                : row.mappingStatus === "BROKEN"
                ? "bg-red-100 text-red-700"
                : "bg-yellow-50 text-yellow-700"
            }`}
          >
            {row.mappingStatus}
          </span>
        ) : (
          <span className="text-gray-400">No mapping</span>
        )}
      </td>
      <td className="px-4 py-2 text-xs text-gray-400 font-mono">
        {row.externalEntityId ? row.externalEntityId.slice(0, 12) + "…" : "—"}
      </td>
      <td className="px-4 py-2">
        {row.lastPublishStatus ? (
          <PublishStatusBadge status={row.lastPublishStatus as import("@/types/catalog-publish").CatalogPublishStatus} />
        ) : (
          <span className="text-xs text-gray-400">Never</span>
        )}
      </td>
      <td className="px-4 py-2 text-xs text-gray-400">
        {row.lastPublishedAt ? new Date(row.lastPublishedAt).toLocaleString() : "—"}
      </td>
      <td className="px-4 py-2">
        <div className="flex gap-1 flex-wrap">
          {hasBrokenMapping ? (
            <span className="text-xs text-red-500" title="Repair the mapping before publishing.">
              Mapping broken
            </span>
          ) : (
            <>
              {btn("Create", "CREATE", !hasActiveMapping)}
              {btn("Update", "UPDATE", hasActiveMapping)}
              {btn("Archive", "ARCHIVE", hasActiveMapping)}
              {btn("Unarchive", "UNARCHIVE", hasActiveMapping)}
            </>
          )}
        </div>
      </td>
    </tr>
  );
}
