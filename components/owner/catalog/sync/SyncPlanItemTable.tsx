"use client";

/**
 * SyncPlanItemTable — table of CatalogSyncPlanItem rows.
 */

import type { CatalogSyncPlanItemDto } from "@/types/catalog-sync";

interface Props {
  items: CatalogSyncPlanItemDto[];
  emptyMessage?: string;
}

const STATUS_COLORS: Record<string, string> = {
  READY:   "bg-green-100 text-green-800",
  BLOCKED: "bg-orange-100 text-orange-800",
  APPLIED: "bg-blue-100 text-blue-800",
  FAILED:  "bg-red-100 text-red-800",
  SKIPPED: "bg-gray-100 text-gray-600",
  PENDING: "bg-yellow-100 text-yellow-800",
};

const ACTION_LABELS: Record<string, string> = {
  APPLY_INTERNAL_PATCH:    "Apply to Internal",
  APPLY_EXTERNAL_PATCH:    "Publish to External",
  CREATE_INTERNAL_ENTITY:  "Create Internal",
  CREATE_EXTERNAL_ENTITY:  "Create External",
  ARCHIVE_INTERNAL_ENTITY: "Archive Internal",
  ARCHIVE_EXTERNAL_ENTITY: "Archive External",
  LINK_MAPPING:            "Link Mapping",
  UNLINK_MAPPING:          "Unlink Mapping",
  SKIP:                    "Skip",
};

export default function SyncPlanItemTable({ items, emptyMessage }: Props) {
  if (items.length === 0) {
    return (
      <div className="text-sm text-gray-500 py-6 text-center">
        {emptyMessage ?? "No plan items"}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded border border-gray-200">
      <table className="min-w-full text-sm divide-y divide-gray-200">
        <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
          <tr>
            <th className="px-4 py-2 text-left">Entity</th>
            <th className="px-4 py-2 text-left">Field</th>
            <th className="px-4 py-2 text-left">Action</th>
            <th className="px-4 py-2 text-left">Direction</th>
            <th className="px-4 py-2 text-left">Status</th>
            <th className="px-4 py-2 text-left">Before</th>
            <th className="px-4 py-2 text-left">After</th>
            <th className="px-4 py-2 text-left">Reason</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 bg-white">
          {items.map((item) => (
            <tr key={item.id} className="hover:bg-gray-50">
              <td className="px-4 py-2 font-mono text-xs text-gray-700">
                {item.internalEntityType ?? item.externalEntityType ?? "—"}
                {item.internalEntityId && (
                  <span className="ml-1 text-gray-400">#{item.internalEntityId.slice(0, 8)}</span>
                )}
              </td>
              <td className="px-4 py-2 text-gray-600">{item.fieldPath ?? "—"}</td>
              <td className="px-4 py-2">{ACTION_LABELS[item.action] ?? item.action}</td>
              <td className="px-4 py-2 text-xs text-gray-500">{item.direction ?? "—"}</td>
              <td className="px-4 py-2">
                <span
                  className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[item.status] ?? "bg-gray-100 text-gray-600"}`}
                >
                  {item.status}
                </span>
              </td>
              <td className="px-4 py-2 text-xs text-gray-500 max-w-[120px] truncate">
                {item.previewBeforeValue !== null && item.previewBeforeValue !== undefined
                  ? JSON.stringify(item.previewBeforeValue)
                  : "—"}
              </td>
              <td className="px-4 py-2 text-xs text-gray-800 max-w-[120px] truncate">
                {item.previewAfterValue !== null && item.previewAfterValue !== undefined
                  ? JSON.stringify(item.previewAfterValue)
                  : "—"}
              </td>
              <td className="px-4 py-2 text-xs text-gray-500 max-w-[180px] truncate">
                {item.blockedReason ?? "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
