/**
 * Safety guards for job types.
 *
 * Each job type has a risk level, and flags indicating whether manual run
 * and retry are permitted. HIGH-risk jobs are blocked in the admin console.
 */

import type { JobType, JobRunStatus } from "@prisma/client";

export type JobRiskLevel = "LOW" | "MEDIUM" | "HIGH";

export interface JobTypeConfig {
  jobType: JobType;
  riskLevel: JobRiskLevel;
  isManualRunAllowed: boolean;
  isRetryAllowed: boolean;
  /** Confirmation message shown to admin before run. */
  confirmMessage: string;
  /** Additional warning for MEDIUM risk. */
  retryConfirmMessage: string;
  description: string;
}

export const JOB_TYPE_CONFIGS: Record<JobType, JobTypeConfig> = {
  CATALOG_SYNC: {
    jobType: "CATALOG_SYNC",
    riskLevel: "LOW",
    isManualRunAllowed: true,
    isRetryAllowed: true,
    confirmMessage: "Sync the catalog for the selected store. Existing catalog items will be updated and new items added.",
    retryConfirmMessage: "Re-run this catalog sync job. The same idempotency rules apply.",
    description: "Run a full sync from Loyverse to the internal catalog.",
  },
  CONNECTION_VALIDATE: {
    jobType: "CONNECTION_VALIDATE",
    riskLevel: "LOW",
    isManualRunAllowed: true,
    isRetryAllowed: true,
    confirmMessage: "Validate credentials for the selected connection. This is a safe read-only check.",
    retryConfirmMessage: "Re-run this connection validation job.",
    description: "Safely verify the validity of connection credentials.",
  },
  CONNECTION_REFRESH_CHECK: {
    jobType: "CONNECTION_REFRESH_CHECK",
    riskLevel: "MEDIUM",
    isManualRunAllowed: true,
    isRetryAllowed: true,
    confirmMessage: "Attempt to refresh the connection token. The same safety guards as the existing refresh logic apply.",
    retryConfirmMessage: "Re-run this token refresh job. Existing idempotency rules are preserved.",
    description: "Safely refresh tokens that are expiring or have expired.",
  },
  ORDER_RECOVERY_RETRY: {
    jobType: "ORDER_RECOVERY_RETRY",
    riskLevel: "MEDIUM",
    isManualRunAllowed: true,
    isRetryAllowed: true,
    confirmMessage: "Re-forward this order to POS. Existing deduplication logic applies so the same order will not be created twice.",
    retryConfirmMessage: "Re-run this order recovery job. Does not bypass existing idempotency rules.",
    description: "Safely retry failed order POS forwarding.",
  },
  ORDER_RECONCILIATION_RETRY: {
    jobType: "ORDER_RECONCILIATION_RETRY",
    riskLevel: "MEDIUM",
    isManualRunAllowed: true,
    isRetryAllowed: true,
    confirmMessage: "Re-run the order adjustment. Deduplication logic applies.",
    retryConfirmMessage: "Re-run this order adjustment retry job. Existing adjustment safety guards are preserved.",
    description: "Safely retry POS order adjustments.",
  },
  ANALYTICS_REBUILD: {
    jobType: "ANALYTICS_REBUILD",
    riskLevel: "LOW",
    isManualRunAllowed: true,
    isRetryAllowed: true,
    confirmMessage: "Rebuild the analytics summary for the selected store.",
    retryConfirmMessage: "Re-run this analytics rebuild job.",
    description: "Regenerate the store revenue summary and aggregated data.",
  },
};

/** Returns true if a job type can be manually triggered in the admin console. */
export function canManuallyRunJobType(jobType: JobType): boolean {
  const config = JOB_TYPE_CONFIGS[jobType];
  return config?.isManualRunAllowed === true && config?.riskLevel !== "HIGH";
}

/** Returns true if a failed job run can be retried. */
export function canRetryJobRun(status: JobRunStatus, jobType: JobType): boolean {
  if (status !== "FAILED") return false;
  const config = JOB_TYPE_CONFIGS[jobType];
  return config?.isRetryAllowed === true && config?.riskLevel !== "HIGH";
}

/** Returns the list of job types that are allowed in the admin console. */
export function getAllowedJobTypes(): JobType[] {
  return (Object.keys(JOB_TYPE_CONFIGS) as JobType[]).filter(
    (jt) => JOB_TYPE_CONFIGS[jt].riskLevel !== "HIGH"
  );
}
