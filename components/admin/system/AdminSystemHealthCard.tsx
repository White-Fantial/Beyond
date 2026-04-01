import Link from "next/link";
import type { AdminSystemComponentHealth } from "@/types/admin-system";
import { healthStatusLabel } from "@/lib/admin/system/labels";
import { healthStatusColor } from "@/lib/admin/system/health";

interface AdminSystemHealthCardProps {
  component: AdminSystemComponentHealth;
}

export function AdminSystemHealthCard({ component }: AdminSystemHealthCardProps) {
  const colors = healthStatusColor(component.status);

  return (
    <div
      className={`flex flex-col gap-2 rounded-lg border p-4 ${colors.border} bg-white`}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-semibold text-gray-800">
          {component.label}
        </span>
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${colors.bg} ${colors.text}`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${colors.dot}`} />
          {healthStatusLabel(component.status)}
        </span>
      </div>

      {/* Summary */}
      <p className="text-xs text-gray-500 leading-relaxed">{component.summary}</p>

      {/* Metrics */}
      {component.metrics && Object.keys(component.metrics).length > 0 && (
        <dl className="mt-1 grid grid-cols-3 gap-x-2 gap-y-1">
          {Object.entries(component.metrics).map(([k, v]) => (
            <div key={k} className="flex flex-col">
              <dt className="text-[10px] uppercase tracking-wide text-gray-400">
                {k}
              </dt>
              <dd className="text-xs font-semibold text-gray-700">
                {v === null || v === undefined ? "—" : String(v)}
              </dd>
            </div>
          ))}
        </dl>
      )}

      {/* Drill-down link */}
      {component.drilldownHref && (
        <div className="mt-auto pt-2 border-t border-gray-100">
          <Link
            href={component.drilldownHref}
            className="text-xs text-blue-600 hover:text-blue-800 hover:underline"
          >
            View details →
          </Link>
        </div>
      )}

      {/* Last checked */}
      {component.lastCheckedAt && (
        <p className="text-[10px] text-gray-400">
          Last checked: {new Date(component.lastCheckedAt).toLocaleTimeString("en-US")}
        </p>
      )}
    </div>
  );
}
