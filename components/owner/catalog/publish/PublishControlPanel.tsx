"use client";

/**
 * PublishControlPanel — interactive publish control for a connection.
 *
 * Features:
 *   - Entity type filter
 *   - Changed-only toggle
 *   - Per-row action buttons (create / update / archive / unarchive)
 *   - Bulk action buttons (publish all changed, retry all failed)
 *   - Inline feedback for publish results
 */

import { useState, useTransition } from "react";
import type { CatalogPublishAction } from "@/types/catalog-publish";
import type { PublishEntityRowData } from "./PublishEntityRow";
import PublishEntityRow from "./PublishEntityRow";

interface Props {
  connectionId: string;
  rows: PublishEntityRowData[];
}

type EntityTypeFilter = "ALL" | "CATEGORY" | "PRODUCT" | "MODIFIER_GROUP" | "MODIFIER_OPTION";

const ENTITY_TYPE_TABS: { label: string; value: EntityTypeFilter }[] = [
  { label: "All", value: "ALL" },
  { label: "Products", value: "PRODUCT" },
  { label: "Categories", value: "CATEGORY" },
  { label: "Modifier Groups", value: "MODIFIER_GROUP" },
  { label: "Modifier Options", value: "MODIFIER_OPTION" },
];

export default function PublishControlPanel({ connectionId, rows }: Props) {
  const [entityTypeFilter, setEntityTypeFilter] = useState<EntityTypeFilter>("ALL");
  const [onlyChanged, setOnlyChanged] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const filtered = entityTypeFilter === "ALL" ? rows : rows.filter((r) => r.internalEntityType === entityTypeFilter);

  async function handleAction(entityId: string, entityType: string, action: CatalogPublishAction) {
    setFeedback(null);
    startTransition(async () => {
      try {
        const res = await fetch("/api/catalog/publish/entity", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            connectionId,
            internalEntityType: entityType,
            internalEntityId: entityId,
            action,
            onlyChanged,
          }),
        });
        const data = await res.json();
        if (data.result?.status === "SUCCEEDED") {
          setFeedback(`✓ ${action} succeeded for ${entityType} ${entityId.slice(0, 8)}`);
        } else if (data.result?.status === "SKIPPED") {
          setFeedback(`⟳ ${entityType} ${entityId.slice(0, 8)} skipped (unchanged)`);
        } else {
          setFeedback(`✗ ${action} failed: ${data.result?.errorMessage ?? data.error ?? "Unknown error"}`);
        }
      } catch (e) {
        setFeedback(`✗ Request failed: ${e instanceof Error ? e.message : String(e)}`);
      }
    });
  }

  async function handleBulkPublishChanged() {
    setFeedback(null);
    startTransition(async () => {
      try {
        const res = await fetch("/api/catalog/publish/connection", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ connectionId, onlyChanged: true }),
        });
        const data = await res.json();
        const r = data.result;
        setFeedback(
          `Bulk publish complete: ${r?.succeeded ?? 0} succeeded, ${r?.failed ?? 0} failed, ${r?.skipped ?? 0} skipped.`
        );
      } catch (e) {
        setFeedback(`Bulk publish failed: ${e instanceof Error ? e.message : String(e)}`);
      }
    });
  }

  async function handleRetry(jobId: string) {
    setFeedback(null);
    startTransition(async () => {
      try {
        const res = await fetch(`/api/catalog/publish/jobs/${jobId}/retry`, { method: "POST" });
        const data = await res.json();
        setFeedback(data.result?.status === "SUCCEEDED" ? "✓ Retry succeeded." : `✗ Retry failed: ${data.result?.errorMessage}`);
      } catch (e) {
        setFeedback(`Retry failed: ${e instanceof Error ? e.message : String(e)}`);
      }
    });
  }
  void handleRetry; // available for job table

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Entity type tabs */}
        <div className="flex gap-1">
          {ENTITY_TYPE_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setEntityTypeFilter(tab.value)}
              className={`px-3 py-1 rounded text-sm font-medium ${
                entityTypeFilter === tab.value
                  ? "bg-indigo-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Changed-only toggle */}
        <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer ml-auto">
          <input
            type="checkbox"
            checked={onlyChanged}
            onChange={(e) => setOnlyChanged(e.target.checked)}
            className="rounded border-gray-300"
          />
          Only changed
        </label>

        {/* Bulk actions */}
        <button
          onClick={handleBulkPublishChanged}
          disabled={isPending}
          className="px-3 py-1.5 bg-indigo-600 text-white text-sm rounded hover:bg-indigo-700 disabled:opacity-50"
        >
          Publish All Changed
        </button>
      </div>

      {/* Feedback */}
      {feedback && (
        <div
          className={`text-sm px-3 py-2 rounded ${
            feedback.startsWith("✓") ? "bg-green-50 text-green-700" : feedback.startsWith("⟳") ? "bg-blue-50 text-blue-600" : "bg-red-50 text-red-700"
          }`}
        >
          {feedback}
        </div>
      )}

      {/* Entity table */}
      <div className="overflow-x-auto rounded border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mapping</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">External ID</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Publish</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Published At</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-gray-400 text-sm">
                  No entities found.
                </td>
              </tr>
            ) : (
              filtered.map((row) => (
                <PublishEntityRow
                  key={`${row.internalEntityType}-${row.internalEntityId}`}
                  row={row}
                  onAction={handleAction}
                  isLoading={isPending}
                />
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
