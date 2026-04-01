import type { AdminJobRunDetail } from "@/types/admin-jobs";
import { AdminJobStatusBadge, AdminJobTypeBadge, AdminJobTriggerBadge } from "./AdminJobBadges";

interface AdminJobRunHeaderProps {
  run: AdminJobRunDetail;
}

function formatDate(d: Date | null | undefined): string {
  if (!d) return "—";
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(new Date(d));
}

function formatDuration(ms: number | null): string {
  if (ms === null) return "—";
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
}

export default function AdminJobRunHeader({ run }: AdminJobRunHeaderProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm mb-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <AdminJobTypeBadge jobType={run.jobType} />
          <AdminJobStatusBadge status={run.status} />
          <AdminJobTriggerBadge triggerSource={run.triggerSource} />
        </div>
        <span className="text-xs font-mono text-gray-400">{run.id}</span>
      </div>

      <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
        <div>
          <dt className="text-xs text-gray-500">Created</dt>
          <dd className="text-gray-800 text-xs mt-0.5 font-mono">{formatDate(run.createdAt)}</dd>
        </div>
        <div>
          <dt className="text-xs text-gray-500">Started</dt>
          <dd className="text-gray-800 text-xs mt-0.5 font-mono">{formatDate(run.startedAt)}</dd>
        </div>
        <div>
          <dt className="text-xs text-gray-500">Finished</dt>
          <dd className="text-gray-800 text-xs mt-0.5 font-mono">{formatDate(run.finishedAt)}</dd>
        </div>
        <div>
          <dt className="text-xs text-gray-500">Duration</dt>
          <dd className="text-gray-800 text-xs mt-0.5 font-mono">{formatDuration(run.durationMs)}</dd>
        </div>
      </div>

      {run.triggeredByUserLabel && (
        <div className="mt-3 text-xs text-gray-500">
          Triggered by: <span className="text-gray-800">{run.triggeredByUserLabel}</span>
        </div>
      )}
    </div>
  );
}
