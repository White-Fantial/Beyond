"use client";

/**
 * PublishJobsTable — renders a table of CatalogPublishJob rows.
 * Used on the publish dashboard to show recent publish history.
 */

import type { CatalogPublishJobRow } from "@/types/catalog-publish";
import PublishStatusBadge from "./PublishStatusBadge";

interface Props {
  jobs: CatalogPublishJobRow[];
  onRetry?: (jobId: string) => void;
}

export default function PublishJobsTable({ jobs, onRetry }: Props) {
  if (!jobs.length) {
    return <p className="text-sm text-gray-500">No publish jobs found.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200 text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase tracking-wider text-xs">Entity Type</th>
            <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase tracking-wider text-xs">Entity ID</th>
            <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase tracking-wider text-xs">Action</th>
            <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase tracking-wider text-xs">Status</th>
            <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase tracking-wider text-xs">Trigger</th>
            <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase tracking-wider text-xs">Created</th>
            <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase tracking-wider text-xs">Error</th>
            <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase tracking-wider text-xs"></th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-100">
          {jobs.map((job) => (
            <tr key={job.id} className="hover:bg-gray-50">
              <td className="px-4 py-2 whitespace-nowrap font-mono text-xs text-gray-600">{job.internalEntityType ?? "—"}</td>
              <td className="px-4 py-2 whitespace-nowrap font-mono text-xs text-gray-400">{(job.internalEntityId ?? "—").slice(0, 12)}…</td>
              <td className="px-4 py-2 whitespace-nowrap">
                <span className="inline-flex px-2 py-0.5 rounded text-xs font-medium bg-indigo-50 text-indigo-700">
                  {job.action}
                </span>
              </td>
              <td className="px-4 py-2 whitespace-nowrap">
                <PublishStatusBadge status={job.status} />
              </td>
              <td className="px-4 py-2 whitespace-nowrap text-xs text-gray-400">{job.triggerSource ?? "—"}</td>
              <td className="px-4 py-2 whitespace-nowrap text-xs text-gray-400">
                {new Date(job.createdAt).toLocaleString()}
              </td>
              <td className="px-4 py-2 text-xs text-red-600 max-w-xs truncate" title={job.errorMessage ?? undefined}>
                {job.errorMessage ?? "—"}
              </td>
              <td className="px-4 py-2 whitespace-nowrap">
                {job.status === "FAILED" && onRetry && (
                  <button
                    onClick={() => onRetry(job.id)}
                    className="text-xs text-blue-600 hover:underline"
                  >
                    Retry
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
