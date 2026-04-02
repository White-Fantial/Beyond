/**
 * Display labels for system health types and severities.
 */

import type { SystemHealthStatus, SystemSeverity } from "@/types/admin-system";

export function healthStatusLabel(status: SystemHealthStatus): string {
  switch (status) {
    case "HEALTHY":
      return "Healthy";
    case "DEGRADED":
      return "Degraded";
    case "DOWN":
      return "Down";
    case "UNKNOWN":
      return "Unknown";
  }
}

export function severityLabel(severity: SystemSeverity): string {
  switch (severity) {
    case "CRITICAL":
      return "Critical";
    case "WARN":
      return "Degraded";
    case "INFO":
      return "Info";
  }
}
