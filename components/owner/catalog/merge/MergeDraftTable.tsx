"use client";

/**
 * MergeDraftTable.tsx
 *
 * Displays a list of merge drafts with status badges and action links.
 */

import Link from "next/link";
import type { CatalogMergeDraftDto } from "@/types/catalog-merge";

interface Props {
  drafts: CatalogMergeDraftDto[];
  connectionId: string;
  storeId: string;
}

const STATUS_COLORS: Record<string, string> = {
  DRAFT:          "bg-gray-100 text-gray-700",
  VALIDATED:      "bg-blue-100 text-blue-700",
  INVALID:        "bg-red-100 text-red-700",
  PLAN_GENERATED: "bg-yellow-100 text-yellow-700",
  APPLIED:        "bg-green-100 text-green-700",
  CANCELLED:      "bg-gray-200 text-gray-500",
};

export default function MergeDraftTable({ drafts, connectionId, storeId }: Props) {
  if (drafts.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400">
        No merge drafts found for this connection.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      <table className="min-w-full divide-y divide-gray-200 text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left font-semibold text-gray-600">Title</th>
            <th className="px-4 py-3 text-left font-semibold text-gray-600">Entity</th>
            <th className="px-4 py-3 text-left font-semibold text-gray-600">Status</th>
            <th className="px-4 py-3 text-left font-semibold text-gray-600">Apply Target</th>
            <th className="px-4 py-3 text-left font-semibold text-gray-600">Created</th>
            <th className="px-4 py-3 text-left font-semibold text-gray-600">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 bg-white">
          {drafts.map((draft) => (
            <tr key={draft.id} className="hover:bg-gray-50">
              <td className="px-4 py-3 font-medium text-gray-900 max-w-xs truncate">
                {draft.title ?? <span className="text-gray-400 italic">Untitled</span>}
              </td>
              <td className="px-4 py-3 text-gray-600">
                <span className="font-mono text-xs">{draft.internalEntityType}</span>
                <br />
                <span className="text-gray-400 text-xs truncate">{draft.internalEntityId}</span>
              </td>
              <td className="px-4 py-3">
                <span
                  className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${
                    STATUS_COLORS[draft.status] ?? "bg-gray-100 text-gray-600"
                  }`}
                >
                  {draft.status}
                </span>
              </td>
              <td className="px-4 py-3 text-gray-600 text-xs">{draft.applyTarget}</td>
              <td className="px-4 py-3 text-gray-500 text-xs">
                {new Date(draft.createdAt).toLocaleString()}
              </td>
              <td className="px-4 py-3">
                <Link
                  href={`/owner/stores/${storeId}/integrations/${connectionId}/merge/${draft.id}`}
                  className="text-blue-600 hover:underline text-xs"
                >
                  Open Editor →
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
