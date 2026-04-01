// Admin Jobs Console — view models for the Platform Admin.
// These types normalize JobRun records into shapes for list and detail views.

import type { JobType, JobRunStatus, JobTriggerSource } from "@prisma/client";

export type { JobType, JobRunStatus, JobTriggerSource };

// ─── List item ────────────────────────────────────────────────────────────────

export interface AdminJobRunListItem {
  id: string;
  jobType: JobType;
  status: JobRunStatus;
  triggerSource: JobTriggerSource;
  tenantId: string | null;
  tenantName: string | null;
  storeId: string | null;
  storeName: string | null;
  provider: string | null;
  triggeredByUserId: string | null;
  triggeredByUserLabel: string | null;
  parentRunId: string | null;
  relatedEntityType: string | null;
  relatedEntityId: string | null;
  errorCode: string | null;
  errorSummary: string | null;
  resultSummary: string | null;
  queuedAt: Date | null;
  startedAt: Date | null;
  finishedAt: Date | null;
  createdAt: Date;
  durationMs: number | null;
  canRetry: boolean;
}

// ─── Detail ───────────────────────────────────────────────────────────────────

export interface AdminJobRunDetail {
  id: string;
  jobType: JobType;
  status: JobRunStatus;
  triggerSource: JobTriggerSource;
  tenantId: string | null;
  tenantName: string | null;
  storeId: string | null;
  storeName: string | null;
  provider: string | null;
  triggeredByUserId: string | null;
  triggeredByUserLabel: string | null;
  parentRunId: string | null;
  relatedEntityType: string | null;
  relatedEntityId: string | null;
  inputJson: Record<string, unknown> | null;
  resultJson: Record<string, unknown> | null;
  errorCode: string | null;
  errorMessage: string | null;
  queuedAt: Date | null;
  startedAt: Date | null;
  finishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  durationMs: number | null;
  canRetry: boolean;
  childRuns: AdminJobRunChildItem[];
}

export interface AdminJobRunChildItem {
  id: string;
  status: JobRunStatus;
  triggerSource: JobTriggerSource;
  createdAt: Date;
  finishedAt: Date | null;
}

// ─── Filter params ────────────────────────────────────────────────────────────

export interface AdminJobFilterParams {
  jobType?: string;
  status?: string;
  tenantId?: string;
  storeId?: string;
  provider?: string;
  triggerSource?: string;
  failedOnly?: string;
  from?: string;
  to?: string;
  page?: string | number;
  pageSize?: string | number;
}

// ─── Manual run input ─────────────────────────────────────────────────────────

export interface ManualJobRunInput {
  jobType: JobType;
  tenantId?: string;
  storeId?: string;
  provider?: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
  notes?: string;
}
