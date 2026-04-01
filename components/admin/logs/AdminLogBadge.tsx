"use client";

import type { AdminLogSeverity, AdminLogType } from "@/types/admin-logs";
import { LOG_TYPE_LABELS, SEVERITY_LABELS } from "@/lib/admin/logs/labels";

interface AdminLogBadgeProps {
  variant: "logType" | "severity" | "status";
  value: string;
  label?: string;
}

const SEVERITY_STYLES: Record<AdminLogSeverity, string> = {
  ERROR: "bg-red-50 text-red-700 border border-red-200",
  WARN: "bg-yellow-50 text-yellow-700 border border-yellow-200",
  INFO: "bg-blue-50 text-blue-700 border border-blue-200",
};

const LOG_TYPE_STYLES: Record<AdminLogType, string> = {
  AUDIT: "bg-violet-50 text-violet-700 border border-violet-200",
  CONNECTION_ACTION: "bg-cyan-50 text-cyan-700 border border-cyan-200",
  WEBHOOK: "bg-orange-50 text-orange-700 border border-orange-200",
  ORDER_EVENT: "bg-green-50 text-green-700 border border-green-200",
};

const STATUS_STYLES: Record<string, string> = {
  SUCCESS: "bg-green-50 text-green-700 border border-green-200",
  success: "bg-green-50 text-green-700 border border-green-200",
  FAILED: "bg-red-50 text-red-600 border border-red-200",
  failure: "bg-red-50 text-red-600 border border-red-200",
  PENDING: "bg-gray-100 text-gray-500 border border-gray-200",
  SKIPPED: "bg-yellow-50 text-yellow-700 border border-yellow-200",
};

export default function AdminLogBadge({ variant, value, label }: AdminLogBadgeProps) {
  let style = "bg-gray-100 text-gray-600 border border-gray-200";
  let displayLabel = label ?? value;

  if (variant === "severity") {
    style = SEVERITY_STYLES[value as AdminLogSeverity] ?? style;
    displayLabel = label ?? SEVERITY_LABELS[value as AdminLogSeverity] ?? value;
  } else if (variant === "logType") {
    style = LOG_TYPE_STYLES[value as AdminLogType] ?? style;
    displayLabel = label ?? LOG_TYPE_LABELS[value as AdminLogType] ?? value;
  } else if (variant === "status") {
    style = STATUS_STYLES[value] ?? style;
  }

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap ${style}`}
    >
      {displayLabel}
    </span>
  );
}
