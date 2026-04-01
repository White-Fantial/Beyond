/**
 * Normalization helpers — convert raw Prisma JobRun rows into view model types.
 */

import { sanitizeJsonValue } from "@/lib/admin/logs/sanitize";
import { canRetryJobRun } from "@/lib/admin/jobs/guards";
import type { AdminJobRunListItem, AdminJobRunDetail, AdminJobRunChildItem } from "@/types/admin-jobs";
import type { JobRun, User, Tenant, Store } from "@prisma/client";

type JobRunWithRelations = JobRun & {
  triggeredByUser: Pick<User, "id" | "name" | "email"> | null;
  tenant?: Pick<Tenant, "id" | "displayName"> | null;
  store?: Pick<Store, "id" | "name"> | null;
  childRuns?: Pick<JobRun, "id" | "status" | "triggerSource" | "createdAt" | "finishedAt">[];
};

function calcDurationMs(startedAt: Date | null, finishedAt: Date | null): number | null {
  if (!startedAt || !finishedAt) return null;
  return finishedAt.getTime() - startedAt.getTime();
}

function truncate(s: string | null | undefined, max = 120): string | null {
  if (!s) return null;
  return s.length > max ? s.slice(0, max) + "…" : s;
}

function extractResultSummary(resultJson: unknown): string | null {
  if (!resultJson || typeof resultJson !== "object") return null;
  const obj = resultJson as Record<string, unknown>;
  if (typeof obj.summary === "string") return truncate(obj.summary);
  if (typeof obj.message === "string") return truncate(obj.message);
  return null;
}

export function normalizeJobRunListItem(row: JobRunWithRelations): AdminJobRunListItem {
  const durationMs = calcDurationMs(row.startedAt, row.finishedAt);

  return {
    id: row.id,
    jobType: row.jobType,
    status: row.status,
    triggerSource: row.triggerSource,
    tenantId: row.tenantId ?? null,
    tenantName: row.tenant?.displayName ?? null,
    storeId: row.storeId ?? null,
    storeName: row.store?.name ?? null,
    provider: row.provider ?? null,
    triggeredByUserId: row.triggeredByUserId ?? null,
    triggeredByUserLabel: row.triggeredByUser
      ? `${row.triggeredByUser.name} (${row.triggeredByUser.email})`
      : null,
    parentRunId: row.parentRunId ?? null,
    relatedEntityType: row.relatedEntityType ?? null,
    relatedEntityId: row.relatedEntityId ?? null,
    errorCode: row.errorCode ?? null,
    errorSummary: truncate(row.errorMessage),
    resultSummary: extractResultSummary(row.resultJson),
    queuedAt: row.queuedAt,
    startedAt: row.startedAt,
    finishedAt: row.finishedAt,
    createdAt: row.createdAt,
    durationMs,
    canRetry: canRetryJobRun(row.status, row.jobType),
  };
}

export function normalizeJobRunDetail(row: JobRunWithRelations): AdminJobRunDetail {
  const durationMs = calcDurationMs(row.startedAt, row.finishedAt);

  const childRuns: AdminJobRunChildItem[] = (row.childRuns ?? []).map((c) => ({
    id: c.id,
    status: c.status,
    triggerSource: c.triggerSource,
    createdAt: c.createdAt,
    finishedAt: c.finishedAt,
  }));

  return {
    id: row.id,
    jobType: row.jobType,
    status: row.status,
    triggerSource: row.triggerSource,
    tenantId: row.tenantId ?? null,
    tenantName: row.tenant?.displayName ?? null,
    storeId: row.storeId ?? null,
    storeName: row.store?.name ?? null,
    provider: row.provider ?? null,
    triggeredByUserId: row.triggeredByUserId ?? null,
    triggeredByUserLabel: row.triggeredByUser
      ? `${row.triggeredByUser.name} (${row.triggeredByUser.email})`
      : null,
    parentRunId: row.parentRunId ?? null,
    relatedEntityType: row.relatedEntityType ?? null,
    relatedEntityId: row.relatedEntityId ?? null,
    inputJson: sanitizeJsonValue(row.inputJson) as Record<string, unknown> | null,
    resultJson: sanitizeJsonValue(row.resultJson) as Record<string, unknown> | null,
    errorCode: row.errorCode ?? null,
    errorMessage: row.errorMessage ?? null,
    queuedAt: row.queuedAt,
    startedAt: row.startedAt,
    finishedAt: row.finishedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    durationMs,
    canRetry: canRetryJobRun(row.status, row.jobType),
    childRuns,
  };
}
