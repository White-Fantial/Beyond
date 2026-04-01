import Link from "next/link";
import type { AdminSystemIncident } from "@/types/admin-system";
import { severityLabel } from "@/lib/admin/system/labels";
import { severityBadgeStyle } from "@/lib/admin/system/health";
import { windowLabel } from "@/lib/admin/system/metrics";

interface AdminSystemIncidentTableProps {
  incidents: AdminSystemIncident[];
}

export function AdminSystemIncidentTable({
  incidents,
}: AdminSystemIncidentTableProps) {
  if (incidents.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-gray-50 py-8 text-center text-sm text-gray-400">
        No incidents.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
          <tr>
            <th className="px-4 py-2 text-left">Incident</th>
            <th className="px-4 py-2 text-left">Subsystem</th>
            <th className="px-4 py-2 text-left">Severity</th>
            <th className="px-4 py-2 text-right">Count</th>
            <th className="px-4 py-2 text-left">Period</th>
            <th className="px-4 py-2 text-left">Details</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {incidents.map((incident) => (
            <tr key={`${incident.key}-${incident.window}`} className="hover:bg-gray-50">
              <td className="px-4 py-3 font-medium text-gray-800">
                {incident.title}
              </td>
              <td className="px-4 py-3 text-xs text-gray-500">
                {incident.subsystem}
              </td>
              <td className="px-4 py-3">
                <span
                  className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${severityBadgeStyle(
                    incident.severity
                  )}`}
                >
                  {severityLabel(incident.severity)}
                </span>
              </td>
              <td className="px-4 py-3 text-right font-semibold tabular-nums text-gray-800">
                {incident.count.toLocaleString()}
              </td>
              <td className="px-4 py-3 text-xs text-gray-500">
                {windowLabel(incident.window)}
              </td>
              <td className="px-4 py-3">
                {incident.drilldownHref ? (
                  <Link
                    href={incident.drilldownHref}
                    className="text-xs text-blue-600 hover:underline"
                  >
                    Go →
                  </Link>
                ) : (
                  <span className="text-xs text-gray-300">—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
