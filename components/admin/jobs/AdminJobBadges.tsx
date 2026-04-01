"use client";

import type { JobRunStatus } from "@prisma/client";
import type { JobType, JobTriggerSource } from "@/types/admin-jobs";
import { JOB_TYPE_LABELS, JOB_STATUS_LABELS, JOB_TRIGGER_SOURCE_LABELS } from "@/lib/admin/jobs/labels";

interface AdminJobStatusBadgeProps {
  status: JobRunStatus;
}

interface AdminJobTypeBadgeProps {
  jobType: JobType;
}

interface AdminJobTriggerBadgeProps {
  triggerSource: JobTriggerSource;
}

const STATUS_STYLES: Record<JobRunStatus, string> = {
  QUEUED: "bg-gray-100 text-gray-600 border border-gray-200",
  RUNNING: "bg-blue-50 text-blue-700 border border-blue-200",
  SUCCEEDED: "bg-green-50 text-green-700 border border-green-200",
  FAILED: "bg-red-50 text-red-600 border border-red-200",
  CANCELLED: "bg-yellow-50 text-yellow-700 border border-yellow-200",
  SKIPPED: "bg-gray-50 text-gray-500 border border-gray-200",
};

const JOB_TYPE_STYLES: Record<JobType, string> = {
  CATALOG_SYNC: "bg-violet-50 text-violet-700 border border-violet-200",
  CONNECTION_VALIDATE: "bg-cyan-50 text-cyan-700 border border-cyan-200",
  CONNECTION_REFRESH_CHECK: "bg-teal-50 text-teal-700 border border-teal-200",
  ORDER_RECOVERY_RETRY: "bg-orange-50 text-orange-700 border border-orange-200",
  ORDER_RECONCILIATION_RETRY: "bg-amber-50 text-amber-700 border border-amber-200",
  ANALYTICS_REBUILD: "bg-indigo-50 text-indigo-700 border border-indigo-200",
};

const TRIGGER_SOURCE_STYLES: Record<JobTriggerSource, string> = {
  SYSTEM: "bg-gray-100 text-gray-600 border border-gray-200",
  ADMIN_MANUAL: "bg-purple-50 text-purple-700 border border-purple-200",
  ADMIN_RETRY: "bg-rose-50 text-rose-700 border border-rose-200",
};

const BADGE_BASE = "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap";

export function AdminJobStatusBadge({ status }: AdminJobStatusBadgeProps) {
  return (
    <span className={`${BADGE_BASE} ${STATUS_STYLES[status] ?? "bg-gray-100 text-gray-600 border border-gray-200"}`}>
      {JOB_STATUS_LABELS[status] ?? status}
    </span>
  );
}

export function AdminJobTypeBadge({ jobType }: AdminJobTypeBadgeProps) {
  return (
    <span className={`${BADGE_BASE} ${JOB_TYPE_STYLES[jobType] ?? "bg-gray-100 text-gray-600 border border-gray-200"}`}>
      {JOB_TYPE_LABELS[jobType] ?? jobType}
    </span>
  );
}

export function AdminJobTriggerBadge({ triggerSource }: AdminJobTriggerBadgeProps) {
  return (
    <span className={`${BADGE_BASE} ${TRIGGER_SOURCE_STYLES[triggerSource] ?? "bg-gray-100 text-gray-600 border border-gray-200"}`}>
      {JOB_TRIGGER_SOURCE_LABELS[triggerSource] ?? triggerSource}
    </span>
  );
}
