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
    return `No data (last ${window})`;
  }
  if (status === "HEALTHY") {
    if (total !== undefined && failures !== undefined) {
      return `Healthy — ${totalLabel ?? "All"} ${total.toLocaleString()}, errors ${failures} (last ${window})`;
    }
    return `Healthy — operating normally (last ${window})`;
  }
  if (status === "DEGRADED") {
    if (failures !== undefined) {
      return `Degraded — ${failLabel ?? "Error"} ${failures} detected (last ${window})`;
    }
    return `Degraded — issues detected (last ${window})`;
  }
  if (status === "DOWN") {
    if (failures !== undefined) {
      return `Down — ${failLabel ?? "Error"} ${failures} (last ${window})`;
    }
    return `Suspected outage (last ${window})`;
  }
  return `Status Unknown`;
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
