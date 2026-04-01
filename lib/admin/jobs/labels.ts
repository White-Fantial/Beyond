/**
 * Human-readable labels for job types, statuses, and trigger sources.
 */

import type { JobType, JobRunStatus, JobTriggerSource } from "@prisma/client";

// ─── Job type labels ──────────────────────────────────────────────────────────

export const JOB_TYPE_LABELS: Record<JobType, string> = {
  CATALOG_SYNC: "Catalog Sync",
  CONNECTION_VALIDATE: "Connection Validate",
  CONNECTION_REFRESH_CHECK: "Connection Refresh Check",
  ORDER_RECOVERY_RETRY: "Order Recovery Retry",
  ORDER_RECONCILIATION_RETRY: "Order Reconciliation Retry",
  ANALYTICS_REBUILD: "Analytics Rebuild",
};

// ─── Job status labels ────────────────────────────────────────────────────────

export const JOB_STATUS_LABELS: Record<JobRunStatus, string> = {
  QUEUED: "Queued",
  RUNNING: "Running",
  SUCCEEDED: "Succeeded",
  FAILED: "Failed",
  CANCELLED: "Cancelled",
  SKIPPED: "Skipped",
};

// ─── Trigger source labels ────────────────────────────────────────────────────

export const JOB_TRIGGER_SOURCE_LABELS: Record<JobTriggerSource, string> = {
  SYSTEM: "System",
  ADMIN_MANUAL: "Admin Manual",
  ADMIN_RETRY: "Admin Retry",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function getJobTypeLabel(jobType: JobType | string): string {
  return JOB_TYPE_LABELS[jobType as JobType] ?? jobType;
}

export function getJobStatusLabel(status: JobRunStatus | string): string {
  return JOB_STATUS_LABELS[status as JobRunStatus] ?? status;
}

export function getTriggerSourceLabel(source: JobTriggerSource | string): string {
  return JOB_TRIGGER_SOURCE_LABELS[source as JobTriggerSource] ?? source;
}
