import { notFound } from "next/navigation";
import Link from "next/link";
import { requirePlatformAdmin } from "@/lib/admin/auth-guard";
import { getAdminJobRunDetail } from "@/services/admin/admin-job.service";
import AdminJobRunHeader from "@/components/admin/jobs/AdminJobRunHeader";
import AdminJobContextLinks from "@/components/admin/jobs/AdminJobContextLinks";
import AdminJobPayloadViewer from "@/components/admin/jobs/AdminJobPayloadViewer";
import AdminRetryJobButton from "@/components/admin/jobs/AdminRetryJobButton";
import AdminKeyValueList from "@/components/admin/AdminKeyValueList";
import { AdminJobStatusBadge } from "@/components/admin/jobs/AdminJobBadges";

interface PageProps {
  params: { jobRunId: string };
}

export default async function AdminJobRunDetailPage({ params }: PageProps) {
  await requirePlatformAdmin();
  const { jobRunId } = params;

  const run = await getAdminJobRunDetail(jobRunId);
  if (!run) notFound();

  const contextRows = [
    { label: "Job Run ID", value: <span className="font-mono text-xs">{run.id}</span> },
    { label: "Job Type", value: run.jobType },
    { label: "Trigger Source", value: run.triggerSource },
    ...(run.triggeredByUserLabel ? [{ label: "Triggered By", value: run.triggeredByUserLabel }] : []),
    ...(run.tenantName ? [{ label: "Tenant", value: run.tenantName }] : []),
    ...(run.storeName ? [{ label: "Store", value: run.storeName }] : []),
    ...(run.provider ? [{ label: "Provider", value: run.provider }] : []),
    ...(run.relatedEntityType ? [{ label: "Related Entity Type", value: run.relatedEntityType }] : []),
    ...(run.relatedEntityId ? [{ label: "Related Entity ID", value: <span className="font-mono text-xs">{run.relatedEntityId}</span> }] : []),
    ...(run.parentRunId ? [{ label: "Parent Run", value: <Link href={`/admin/jobs/${run.parentRunId}`} className="text-blue-600 hover:underline font-mono text-xs">{run.parentRunId}</Link> }] : []),
  ];

  return (
    <div className="max-w-4xl">
      <div className="mb-4">
        <Link href="/admin/jobs" className="text-xs text-gray-400 hover:underline">
          ← Back to Jobs
        </Link>
      </div>

      <AdminJobRunHeader run={run} />

      <div className="space-y-4">
        {/* Context */}
        <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Context</h2>
          <AdminKeyValueList items={contextRows} />
        </div>

        {/* Error section */}
        {run.status === "FAILED" && (run.errorCode || run.errorMessage) && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-5">
            <h2 className="text-sm font-semibold text-red-700 mb-3">Error Details</h2>
            {run.errorCode && (
              <div className="text-xs font-mono text-red-600 mb-1">Code: {run.errorCode}</div>
            )}
            {run.errorMessage && (
              <div className="text-xs text-red-700">{run.errorMessage}</div>
            )}
          </div>
        )}

        {/* Child retry runs */}
        {run.childRuns.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">Retry Runs ({run.childRuns.length})</h2>
            <div className="space-y-2">
              {run.childRuns.map((child) => (
                <div key={child.id} className="flex items-center gap-3 text-xs">
                  <Link href={`/admin/jobs/${child.id}`} className="font-mono text-blue-600 hover:underline">
                    {child.id.slice(0, 8)}…
                  </Link>
                  <AdminJobStatusBadge status={child.status} />
                  <span className="text-gray-400">{new Date(child.createdAt).toLocaleString("en-US")}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Input */}
        <AdminJobPayloadViewer title="Input" data={run.inputJson} />

        {/* Result */}
        <AdminJobPayloadViewer title="Result" data={run.resultJson} defaultOpen={run.status === "SUCCEEDED"} />

        {/* Context links */}
        <AdminJobContextLinks run={run} />

        {/* Actions */}
        {run.canRetry && (
          <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">Actions</h2>
            <AdminRetryJobButton jobRunId={run.id} />
          </div>
        )}
      </div>
    </div>
  );
}
