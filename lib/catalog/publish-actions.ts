/**
 * Catalog publish action helpers — Phase 4.
 *
 * Centralises publish action labels, badge colours, and guard helpers.
 *
 * TODO Phase 5: add external change detection helpers
 * TODO Phase 6: add conflict detection helpers
 * TODO Phase 7: policy-based sync helpers
 */

import type { CatalogPublishAction, CatalogPublishStatus } from "@/types/catalog-publish";

// ─── Labels ───────────────────────────────────────────────────────────────────

export const PUBLISH_ACTION_LABELS: Record<CatalogPublishAction, string> = {
  CREATE: "Create",
  UPDATE: "Update",
  ARCHIVE: "Archive",
  UNARCHIVE: "Unarchive",
};

export const PUBLISH_STATUS_LABELS: Record<CatalogPublishStatus, string> = {
  PENDING: "Pending",
  RUNNING: "Running",
  SUCCEEDED: "Succeeded",
  FAILED: "Failed",
  SKIPPED: "Skipped",
  CANCELLED: "Cancelled",
};

// ─── Badge colours (Tailwind class names) ─────────────────────────────────────

export const PUBLISH_STATUS_BADGE: Record<CatalogPublishStatus, string> = {
  PENDING: "bg-yellow-50 text-yellow-700",
  RUNNING: "bg-blue-50 text-blue-700",
  SUCCEEDED: "bg-green-100 text-green-700",
  FAILED: "bg-red-100 text-red-700",
  SKIPPED: "bg-gray-100 text-gray-500",
  CANCELLED: "bg-gray-100 text-gray-400",
};

// ─── Guards ───────────────────────────────────────────────────────────────────

/** Returns true when a publish job has reached a terminal state. */
export function isTerminalPublishStatus(status: CatalogPublishStatus): boolean {
  return status === "SUCCEEDED" || status === "FAILED" || status === "SKIPPED" || status === "CANCELLED";
}

/** Returns true when the job can be retried. */
export function canRetryPublishJob(status: CatalogPublishStatus): boolean {
  return status === "FAILED";
}

/**
 * Given a mapping status, returns which publish actions are allowed.
 * Used to drive UI button state.
 */
export function allowedActionsForMappingStatus(
  mappingStatus: "ACTIVE" | "NEEDS_REVIEW" | "UNMATCHED" | "BROKEN" | "ARCHIVED" | null
): CatalogPublishAction[] {
  switch (mappingStatus) {
    case "ACTIVE":
      return ["UPDATE", "ARCHIVE", "UNARCHIVE"];
    case null:
    case "UNMATCHED":
    case "NEEDS_REVIEW":
      return ["CREATE"];
    case "BROKEN":
    case "ARCHIVED":
      // Block all — mapping must be repaired/reactivated first.
      return [];
  }
}
