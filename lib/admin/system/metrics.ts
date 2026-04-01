/**
 * Metrics helpers — window utilities for the metrics service.
 */

import type { MetricsWindow } from "@/types/admin-system";

/** Return the Date that marks the start of the given metrics window. */
export function windowStart(window: MetricsWindow): Date {
  const now = new Date();
  switch (window) {
    case "24h":
      return new Date(now.getTime() - 24 * 60 * 60 * 1000);
    case "7d":
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  }
}

/** Format a metric window for display. */
export function windowLabel(window: MetricsWindow): string {
  switch (window) {
    case "24h":
      return "최근 24시간";
    case "7d":
      return "최근 7일";
  }
}
