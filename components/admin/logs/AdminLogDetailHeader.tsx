import type { AdminLogDetail } from "@/types/admin-logs";
import { getLogTypeLabel } from "@/lib/admin/logs/labels";
import AdminLogBadge from "./AdminLogBadge";

interface AdminLogDetailHeaderProps {
  log: AdminLogDetail;
}

function formatDate(d: Date): string {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(new Date(d));
}

function getTitle(log: AdminLogDetail): string {
  switch (log.logType) {
    case "AUDIT":
      return log.action;
    case "CONNECTION_ACTION":
      return `${log.provider} — ${log.actionType}`;
    case "WEBHOOK":
      return `Webhook — ${log.channelType ?? "unknown"} / ${log.eventName ?? "unknown event"}`;
    case "ORDER_EVENT":
      return `Order — ${log.eventType}`;
  }
}

function getStatusValue(log: AdminLogDetail): string | null {
  if (log.logType === "CONNECTION_ACTION") return log.status;
  if (log.logType === "WEBHOOK") return log.processingStatus;
  return null;
}

export default function AdminLogDetailHeader({ log }: AdminLogDetailHeaderProps) {
  const statusValue = getStatusValue(log);

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm mb-5">
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <AdminLogBadge
          variant="logType"
          value={log.logType}
          label={getLogTypeLabel(log.logType)}
        />
        <AdminLogBadge variant="severity" value={log.severity} />
        {statusValue && <AdminLogBadge variant="status" value={statusValue} />}
      </div>

      <h1 className="text-xl font-bold text-gray-900 mb-1">{getTitle(log)}</h1>

      <p className="text-sm text-gray-500 font-mono">{formatDate(log.occurredAt)}</p>

      <p className="text-xs text-gray-400 mt-1 font-mono">ID: {log.id}</p>
    </div>
  );
}
