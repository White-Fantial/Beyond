/**
 * Display labels for system health types and severities.
 */

import type { SystemHealthStatus, SystemSeverity } from "@/types/admin-system";

export function healthStatusLabel(status: SystemHealthStatus): string {
  switch (status) {
    case "HEALTHY":
      return "Healthy";
    case "DEGRADED":
      return "부분 이상";
    case "DOWN":
      return "중단";
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
      return "정보";
  }
}
