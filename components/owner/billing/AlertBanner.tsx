import type { BillingAlert, BillingAlertSeverity } from "@/types/owner-billing";

const severityStyles: Record<BillingAlertSeverity, string> = {
  critical: "bg-red-50 border-red-200 text-red-800",
  warning: "bg-yellow-50 border-yellow-200 text-yellow-800",
  info: "bg-blue-50 border-blue-200 text-blue-800",
};

const severityIcon: Record<BillingAlertSeverity, string> = {
  critical: "⚠️",
  warning: "⚡",
  info: "ℹ️",
};

export default function AlertBanner({ alerts }: { alerts: BillingAlert[] }) {
  if (alerts.length === 0) return null;
  return (
    <div className="flex flex-col gap-2">
      {alerts.map((alert) => (
        <div
          key={alert.id}
          className={`border rounded-lg p-4 flex items-start gap-3 ${severityStyles[alert.severity]}`}
        >
          <span className="text-base shrink-0 mt-0.5">{severityIcon[alert.severity]}</span>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm">{alert.title}</p>
            <p className="text-sm mt-0.5">{alert.message}</p>
            {alert.actionLabel && alert.actionHref && (
              <a
                href={alert.actionHref}
                className="inline-block mt-2 text-xs font-medium underline hover:no-underline"
              >
                {alert.actionLabel} →
              </a>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
