import Link from "next/link";
import type { AdminJobRunListItem } from "@/types/admin-jobs";
import { AdminJobStatusBadge, AdminJobTypeBadge, AdminJobTriggerBadge } from "./AdminJobBadges";
import AdminJobEmptyState from "./AdminJobEmptyState";
import AdminRetryJobButton from "./AdminRetryJobButton";

interface AdminJobTableProps {
  items: AdminJobRunListItem[];
  hasFilters: boolean;
}

function formatDate(d: Date): string {
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

export default function AdminJobTable({ items, hasFilters }: AdminJobTableProps) {
  if (items.length === 0) {
    return <AdminJobEmptyState hasFilters={hasFilters} />;
  }

  return (
    <>
      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
            <tr>
              <th className="px-4 py-3 whitespace-nowrap">Created</th>
              <th className="px-4 py-3 whitespace-nowrap">Job type</th>
              <th className="px-4 py-3 whitespace-nowrap">Status</th>
              <th className="px-4 py-3 whitespace-nowrap">Tenant / Store</th>
              <th className="px-4 py-3 whitespace-nowrap">Provider</th>
              <th className="px-4 py-3 whitespace-nowrap">Trigger</th>
              <th className="px-4 py-3 whitespace-nowrap">Triggered by</th>
              <th className="px-4 py-3 whitespace-nowrap">Duration</th>
              <th className="px-4 py-3">Result / Error</th>
              <th className="px-4 py-3 whitespace-nowrap">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {items.map((item) => (
              <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap font-mono">
                  {formatDate(item.createdAt)}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <AdminJobTypeBadge jobType={item.jobType} />
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <AdminJobStatusBadge status={item.status} />
                </td>
                <td className="px-4 py-3 text-xs text-gray-600">
                  {item.tenantName && (
                    <Link
                      href={`/admin/tenants/${item.tenantId}`}
                      className="hover:underline text-gray-800 font-medium block"
                    >
                      {item.tenantName}
                    </Link>
                  )}
                  {item.storeName && (
                    <Link
                      href={`/admin/stores/${item.storeId}`}
                      className="hover:underline text-gray-500 block"
                    >
                      {item.storeName}
                    </Link>
                  )}
                  {!item.tenantName && !item.storeName && <span className="text-gray-400">—</span>}
                </td>
                <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">
                  {item.provider ?? "—"}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <AdminJobTriggerBadge triggerSource={item.triggerSource} />
                </td>
                <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">
                  {item.triggeredByUserLabel ?? "—"}
                </td>
                <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap font-mono">
                  {formatDuration(item.durationMs)}
                </td>
                <td className="px-4 py-3 text-xs text-gray-600 max-w-xs">
                  {item.status === "FAILED" && item.errorSummary && (
                    <span className="text-red-600 block truncate" title={item.errorSummary}>
                      {item.errorSummary}
                    </span>
                  )}
                  {item.status === "SUCCEEDED" && item.resultSummary && (
                    <span className="text-green-700 block truncate" title={item.resultSummary}>
                      {item.resultSummary}
                    </span>
                  )}
                  {!item.errorSummary && !item.resultSummary && (
                    <span className="text-gray-400">—</span>
                  )}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/admin/jobs/${item.id}`}
                      className="text-xs text-blue-600 hover:underline"
                    >
                      Details
                    </Link>
                    {item.canRetry && <AdminRetryJobButton jobRunId={item.id} />}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {items.map((item) => (
          <div key={item.id} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex flex-wrap gap-1">
                <AdminJobTypeBadge jobType={item.jobType} />
                <AdminJobStatusBadge status={item.status} />
              </div>
              <span className="text-xs text-gray-400 whitespace-nowrap shrink-0">
                {formatDate(item.createdAt)}
              </span>
            </div>
            <div className="text-xs text-gray-600 space-y-1">
              {item.tenantName && <div>Tenant: {item.tenantName}</div>}
              {item.storeName && <div>Store: {item.storeName}</div>}
              {item.provider && <div>Provider: {item.provider}</div>}
              <div className="flex items-center gap-1">
                <span>Trigger:</span>
                <AdminJobTriggerBadge triggerSource={item.triggerSource} />
              </div>
              {item.durationMs !== null && (
                <div>Duration: {formatDuration(item.durationMs)}</div>
              )}
              {item.status === "FAILED" && item.errorSummary && (
                <div className="text-red-600 truncate">{item.errorSummary}</div>
              )}
            </div>
            <div className="mt-3 flex items-center gap-3">
              <Link
                href={`/admin/jobs/${item.id}`}
                className="text-xs text-blue-600 hover:underline"
              >
                View details
              </Link>
              {item.canRetry && <AdminRetryJobButton jobRunId={item.id} />}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
