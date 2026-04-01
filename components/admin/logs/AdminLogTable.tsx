import Link from "next/link";
import type { AdminLogListItem } from "@/types/admin-logs";
import { getLogTypeLabel, getActionTypeLabel, getProviderLabel } from "@/lib/admin/logs/labels";
import AdminLogBadge from "./AdminLogBadge";
import AdminLogEmptyState from "./AdminLogEmptyState";

interface AdminLogTableProps {
  items: AdminLogListItem[];
  hasFilters: boolean;
}

function formatDate(d: Date): string {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(new Date(d));
}

export default function AdminLogTable({ items, hasFilters }: AdminLogTableProps) {
  if (items.length === 0) {
    return <AdminLogEmptyState hasFilters={hasFilters} />;
  }

  return (
    <>
      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
            <tr>
              <th className="px-4 py-3 whitespace-nowrap">발생 시각</th>
              <th className="px-4 py-3 whitespace-nowrap">유형</th>
              <th className="px-4 py-3">제목</th>
              <th className="px-4 py-3 whitespace-nowrap">Tenant / Store</th>
              <th className="px-4 py-3 whitespace-nowrap">Provider</th>
              <th className="px-4 py-3 whitespace-nowrap">Action</th>
              <th className="px-4 py-3 whitespace-nowrap">Status</th>
              <th className="px-4 py-3 whitespace-nowrap">Severity</th>
              <th className="px-4 py-3 whitespace-nowrap">상세</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {items.map((item) => (
              <tr
                key={`${item.logType}-${item.id}`}
                className="hover:bg-gray-50 transition-colors"
              >
                <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap font-mono">
                  {formatDate(item.occurredAt)}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <AdminLogBadge
                    variant="logType"
                    value={item.logType}
                    label={getLogTypeLabel(item.logType)}
                  />
                </td>
                <td className="px-4 py-3 max-w-xs">
                  <p className="font-medium text-gray-900 truncate" title={item.title}>
                    {item.title}
                  </p>
                  {item.subtitle && (
                    <p className="text-xs text-gray-400 truncate mt-0.5" title={item.subtitle}>
                      {item.subtitle}
                    </p>
                  )}
                </td>
                <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">
                  {item.tenantName ? (
                    <Link
                      href={`/admin/tenants/${item.tenantId}`}
                      className="hover:underline text-blue-600"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {item.tenantName}
                    </Link>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                  {item.storeName && (
                    <>
                      <span className="text-gray-300 mx-1">/</span>
                      <Link
                        href={`/admin/stores/${item.storeId}`}
                        className="hover:underline text-blue-600"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {item.storeName}
                      </Link>
                    </>
                  )}
                </td>
                <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">
                  {getProviderLabel(item.provider)}
                </td>
                <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap max-w-[160px]">
                  <span className="truncate block" title={item.actionType ?? undefined}>
                    {getActionTypeLabel(item.logType, item.actionType)}
                  </span>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  {item.status ? (
                    <AdminLogBadge variant="status" value={item.status} />
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <AdminLogBadge
                    variant="severity"
                    value={item.severity}
                  />
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <Link
                    href={`/admin/logs/${item.logType.toLowerCase()}/${item.id}`}
                    className="text-xs font-medium text-red-600 hover:underline"
                  >
                    상세 →
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile stacked list */}
      <div className="md:hidden space-y-2">
        {items.map((item) => (
          <div
            key={`${item.logType}-${item.id}`}
            className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm"
          >
            <div className="flex items-start justify-between gap-2 mb-1">
              <div className="flex gap-1.5 flex-wrap">
                <AdminLogBadge
                  variant="logType"
                  value={item.logType}
                  label={getLogTypeLabel(item.logType)}
                />
                <AdminLogBadge variant="severity" value={item.severity} />
              </div>
              <span className="text-xs text-gray-400 whitespace-nowrap font-mono shrink-0">
                {new Date(item.occurredAt).toLocaleString("ko-KR")}
              </span>
            </div>
            <p className="text-sm font-medium text-gray-900 truncate">{item.title}</p>
            {item.subtitle && (
              <p className="text-xs text-gray-400 truncate mt-0.5">{item.subtitle}</p>
            )}
            <div className="flex items-center justify-between mt-2">
              <span className="text-xs text-gray-500">
                {item.tenantName ?? item.tenantId ?? ""}
                {item.storeName ? ` / ${item.storeName}` : ""}
              </span>
              <Link
                href={`/admin/logs/${item.logType.toLowerCase()}/${item.id}`}
                className="text-xs font-medium text-red-600 hover:underline"
              >
                상세 →
              </Link>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
