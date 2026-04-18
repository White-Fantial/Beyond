"use client";

/**
 * MergeEditorHeader.tsx
 *
 * Shows the entity info, current status, and apply target selector for a merge draft.
 */

import type { CatalogMergeDraftDto, CatalogMergeApplyTarget } from "@/types/catalog-merge";

interface Props {
  draft: CatalogMergeDraftDto;
}

const STATUS_COLORS: Record<string, string> = {
  DRAFT:          "bg-gray-100 text-gray-700",
  VALIDATED:      "bg-blue-100 text-blue-700",
  INVALID:        "bg-red-100 text-red-700",
  PLAN_GENERATED: "bg-yellow-100 text-yellow-700",
  APPLIED:        "bg-green-100 text-green-700",
  CANCELLED:      "bg-gray-200 text-gray-500",
};

const APPLY_TARGET_LABELS: Record<CatalogMergeApplyTarget, string> = {
  INTERNAL_ONLY:        "Internal only (apply changes to Beyond catalog)",
  EXTERNAL_ONLY:        "External only (push changes to channel)",
  INTERNAL_THEN_EXTERNAL: "Internal → then External (sync both sides)",
};

export default function MergeEditorHeader({ draft }: Props) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 space-y-4">
      {/* Title row */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">
            {draft.title ?? <span className="text-gray-400 italic">Untitled Merge Draft</span>}
          </h2>
          {draft.summary && (
            <p className="text-sm text-gray-500 mt-1">{draft.summary}</p>
          )}
        </div>
        <span
          className={`inline-flex items-center rounded px-2.5 py-1 text-xs font-semibold shrink-0 ${
            STATUS_COLORS[draft.status] ?? "bg-gray-100 text-gray-600"
          }`}
        >
          {draft.status}
        </span>
      </div>

      {/* Entity info */}
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <span className="text-gray-500">Internal entity</span>
          <div className="font-mono text-xs text-gray-800 mt-0.5">
            {draft.internalEntityType} / {draft.internalEntityId}
          </div>
        </div>
        {draft.externalEntityId && (
          <div>
            <span className="text-gray-500">External entity</span>
            <div className="font-mono text-xs text-gray-800 mt-0.5">
              {draft.externalEntityType} / {draft.externalEntityId}
            </div>
          </div>
        )}
        {draft.conflictId && (
          <div>
            <span className="text-gray-500">Linked conflict</span>
            <div className="font-mono text-xs text-gray-400 mt-0.5">{draft.conflictId}</div>
          </div>
        )}
      </div>

      {/* Apply target */}
      <div className="text-sm">
        <span className="font-medium text-gray-700">Apply target: </span>
        <span className="text-gray-600">
          {APPLY_TARGET_LABELS[draft.applyTarget] ?? draft.applyTarget}
        </span>
      </div>

      {/* Timestamps */}
      <div className="flex gap-6 text-xs text-gray-400">
        <span>Created: {new Date(draft.createdAt).toLocaleString()}</span>
        <span>Updated: {new Date(draft.updatedAt).toLocaleString()}</span>
        {draft.createdByUserId && <span>By: {draft.createdByUserId}</span>}
      </div>
    </div>
  );
}
