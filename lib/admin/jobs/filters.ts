/**
 * Job filter parameter parsing for the Admin Jobs Console.
 */

import type { JobType, JobRunStatus, JobTriggerSource } from "@prisma/client";
import type { AdminJobFilterParams } from "@/types/admin-jobs";

export const JOB_PAGE_SIZE = 20;
export const JOB_MAX_PAGE_SIZE = 100;

const VALID_JOB_TYPES = new Set<JobType>([
  "CATALOG_SYNC",
  "CONNECTION_VALIDATE",
  "CONNECTION_REFRESH_CHECK",
  "ORDER_RECOVERY_RETRY",
  "ORDER_RECONCILIATION_RETRY",
  "ANALYTICS_REBUILD",
]);

const VALID_JOB_STATUSES = new Set<JobRunStatus>([
  "QUEUED",
  "RUNNING",
  "SUCCEEDED",
  "FAILED",
  "CANCELLED",
  "SKIPPED",
]);

const VALID_TRIGGER_SOURCES = new Set<JobTriggerSource>([
  "SYSTEM",
  "ADMIN_MANUAL",
  "ADMIN_RETRY",
]);

export interface ParsedAdminJobFilters {
  jobType: JobType | undefined;
  status: JobRunStatus | undefined;
  tenantId: string | undefined;
  storeId: string | undefined;
  provider: string | undefined;
  triggerSource: JobTriggerSource | undefined;
  failedOnly: boolean;
  from: Date | undefined;
  to: Date | undefined;
  page: number;
  pageSize: number;
  skip: number;
}

export function parseAdminJobFilters(
  raw: AdminJobFilterParams
): ParsedAdminJobFilters {
  const rawJobType = (raw.jobType ?? "").toUpperCase();
  const jobType = VALID_JOB_TYPES.has(rawJobType as JobType)
    ? (rawJobType as JobType)
    : undefined;

  const rawStatus = (raw.status ?? "").toUpperCase();
  const status = VALID_JOB_STATUSES.has(rawStatus as JobRunStatus)
    ? (rawStatus as JobRunStatus)
    : undefined;

  const rawTriggerSource = (raw.triggerSource ?? "").toUpperCase();
  const triggerSource = VALID_TRIGGER_SOURCES.has(rawTriggerSource as JobTriggerSource)
    ? (rawTriggerSource as JobTriggerSource)
    : undefined;

  const from = raw.from ? parseDate(raw.from) : undefined;
  const to = raw.to ? parseDate(raw.to) : undefined;

  const page = Math.max(1, Number(raw.page ?? 1) || 1);
  const pageSize = Math.min(
    JOB_MAX_PAGE_SIZE,
    Math.max(1, Number(raw.pageSize ?? JOB_PAGE_SIZE) || JOB_PAGE_SIZE)
  );

  return {
    jobType,
    status,
    tenantId: nonempty(raw.tenantId),
    storeId: nonempty(raw.storeId),
    provider: nonempty(raw.provider),
    triggerSource,
    failedOnly: raw.failedOnly === "1" || raw.failedOnly === "true",
    from,
    to,
    page,
    pageSize,
    skip: (page - 1) * pageSize,
  };
}

function nonempty(v: string | undefined): string | undefined {
  return v && v.trim() ? v.trim() : undefined;
}

function parseDate(v: string): Date | undefined {
  const d = new Date(v);
  return isNaN(d.getTime()) ? undefined : d;
}
