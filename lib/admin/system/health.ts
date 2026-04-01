/**
 * Health helpers — convenience wrappers used by the health service.
 */

import type { SystemHealthStatus, SystemSeverity } from "@/types/admin-system";
import { statusToSeverity } from "./thresholds";

export { statusToSeverity };

/** Build a short human-readable summary for a health component. */
export function buildHealthSummary(
  status: SystemHealthStatus,
  options: {
    totalLabel?: string;
    total?: number;
    failLabel?: string;
    failures?: number;
    window?: string;
  } = {}
): string {
  const { totalLabel, total, failLabel, failures, window = "24h" } = options;

  if (status === "UNKNOWN") {
    return `데이터 없음 (최근 ${window})`;
  }
  if (status === "HEALTHY") {
    if (total !== undefined && failures !== undefined) {
      return `정상 — ${totalLabel ?? "전체"} ${total.toLocaleString()}건, 오류 ${failures}건 (최근 ${window})`;
    }
    return `정상 동작 중 (최근 ${window})`;
  }
  if (status === "DEGRADED") {
    if (failures !== undefined) {
      return `부분 이상 — ${failLabel ?? "오류"} ${failures}건 감지 (최근 ${window})`;
    }
    return `부분 이상 감지 (최근 ${window})`;
  }
  if (status === "DOWN") {
    if (failures !== undefined) {
      return `중단 — ${failLabel ?? "오류"} ${failures}건 (최근 ${window})`;
    }
    return `기능 중단 의심 (최근 ${window})`;
  }
  return `상태 알 수 없음`;
}

/** Convert a SystemHealthStatus to a Tailwind color class set. */
export function healthStatusColor(status: SystemHealthStatus): {
  bg: string;
  text: string;
  border: string;
  dot: string;
} {
  switch (status) {
    case "HEALTHY":
      return {
        bg: "bg-green-50",
        text: "text-green-700",
        border: "border-green-200",
        dot: "bg-green-500",
      };
    case "DEGRADED":
      return {
        bg: "bg-yellow-50",
        text: "text-yellow-700",
        border: "border-yellow-200",
        dot: "bg-yellow-500",
      };
    case "DOWN":
      return {
        bg: "bg-red-50",
        text: "text-red-700",
        border: "border-red-200",
        dot: "bg-red-500",
      };
    case "UNKNOWN":
    default:
      return {
        bg: "bg-gray-50",
        text: "text-gray-600",
        border: "border-gray-200",
        dot: "bg-gray-400",
      };
  }
}

/** Convert a SystemSeverity to a Tailwind badge style. */
export function severityBadgeStyle(severity: SystemSeverity): string {
  switch (severity) {
    case "CRITICAL":
      return "bg-red-100 text-red-800 border border-red-200";
    case "WARN":
      return "bg-yellow-100 text-yellow-800 border border-yellow-200";
    case "INFO":
    default:
      return "bg-blue-100 text-blue-800 border border-blue-200";
  }
}
