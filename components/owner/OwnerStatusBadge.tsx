import type { ConnectionSummaryStatus, AlertSeverity } from "@/types/owner-dashboard";
import {
  CONNECTION_STATUS_LABELS,
  CONNECTION_STATUS_BADGE_CLASS,
  SEVERITY_LABELS,
  SEVERITY_BADGE_CLASS,
  STORE_STATUS_LABELS,
  STORE_STATUS_BADGE_CLASS,
} from "@/lib/owner/labels";

interface StoreStatusBadgeProps {
  status: string;
}

export function StoreStatusBadge({ status }: StoreStatusBadgeProps) {
  const label = STORE_STATUS_LABELS[status] ?? status;
  const cls = STORE_STATUS_BADGE_CLASS[status] ?? "bg-gray-100 text-gray-500";
  return (
    <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded ${cls}`}>
      {label}
    </span>
  );
}

interface ConnectionStatusBadgeProps {
  status: ConnectionSummaryStatus;
}

export function ConnectionStatusBadge({ status }: ConnectionStatusBadgeProps) {
  const label = CONNECTION_STATUS_LABELS[status];
  const cls = CONNECTION_STATUS_BADGE_CLASS[status];
  return (
    <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded ${cls}`}>
      {label}
    </span>
  );
}

interface SeverityBadgeProps {
  severity: AlertSeverity;
}

export function SeverityBadge({ severity }: SeverityBadgeProps) {
  const label = SEVERITY_LABELS[severity];
  const cls = SEVERITY_BADGE_CLASS[severity];
  return (
    <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded ${cls}`}>
      {label}
    </span>
  );
}
