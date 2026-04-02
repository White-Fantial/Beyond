import Link from "next/link";
import { SeverityBadge } from "./OwnerStatusBadge";
import type { OwnerDashboardAlert } from "@/types/owner-dashboard";

interface OwnerAlertsPanelProps {
  alerts: OwnerDashboardAlert[];
}

export default function OwnerAlertsPanel({ alerts }: OwnerAlertsPanelProps) {
  if (alerts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center">
        <div className="text-3xl mb-3">✅</div>
        <div className="font-medium text-gray-700">No active alerts</div>
        <div className="text-sm text-gray-400 mt-1">
          Your business is running smoothly right now.
        </div>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-gray-100">
      {alerts.map((alert) => (
        <li key={alert.id} className="py-4 flex items-start gap-3">
          <div className="pt-0.5">
            <SeverityBadge severity={alert.severity} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-medium text-gray-900 text-sm">{alert.title}</div>
            <div className="text-sm text-gray-500 mt-0.5">{alert.message}</div>
          </div>
          {alert.href && (
            <Link
              href={alert.href}
              className="shrink-0 text-xs text-brand-600 hover:text-brand-800 font-medium transition-colors"
            >
              View →
            </Link>
          )}
        </li>
      ))}
    </ul>
  );
}
