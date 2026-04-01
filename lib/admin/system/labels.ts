/**
 * Display labels for system health types and severities.
 */

import type { SystemHealthStatus, SystemSeverity } from "@/types/admin-system";

export function healthStatusLabel(status: SystemHealthStatus): string {
  switch (status) {
    case "HEALTHY":
      return "정상";
    case "DEGRADED":
      return "부분 이상";
    case "DOWN":
      return "중단";
    case "UNKNOWN":
      return "알 수 없음";
  }
}

export function severityLabel(severity: SystemSeverity): string {
  switch (severity) {
    case "CRITICAL":
      return "심각";
    case "WARN":
      return "경고";
    case "INFO":
      return "정보";
  }
}
