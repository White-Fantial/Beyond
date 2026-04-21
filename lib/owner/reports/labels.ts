/**
 * Owner Reports — display label helpers.
 */

import type { OwnerReportRangePreset, OrderSourceChannel, InsightSeverity } from "@/types/owner-reports";

/** Human-readable label for an order source channel. */
export function channelLabel(channel: OrderSourceChannel | string): string {
  const map: Record<string, string> = {
    POS: "Point of Sale",
    UBER_EATS: "Uber Eats",
    DOORDASH: "DoorDash",
    ONLINE: "Online Orders",
    SUBSCRIPTION: "Subscriptions",
    MANUAL: "Manual",
    UNKNOWN: "Unknown",
  };
  return map[channel] ?? channel;
}

/** Short badge label for a channel. */
export function channelBadgeLabel(channel: OrderSourceChannel | string): string {
  const map: Record<string, string> = {
    POS: "POS",
    UBER_EATS: "Uber",
    DOORDASH: "DD",
    ONLINE: "Online",
    SUBSCRIPTION: "Sub",
    MANUAL: "Manual",
    UNKNOWN: "Unknown",
  };
  return map[channel] ?? channel;
}

/** Human-readable label for a report preset. */
export function presetLabel(preset: OwnerReportRangePreset): string {
  const map: Record<OwnerReportRangePreset, string> = {
    today: "Today",
    yesterday: "Yesterday",
    last7: "Last 7 Days",
    last30: "Last 30 Days",
    thisMonth: "This Month",
    lastMonth: "Last Month",
    custom: "Custom Range",
  };
  return map[preset] ?? preset;
}

/** Tailwind badge colour classes for insight severity. */
export function insightSeverityClasses(severity: InsightSeverity): string {
  switch (severity) {
    case "critical": return "bg-red-50 border-red-200 text-red-800";
    case "warning":  return "bg-yellow-50 border-yellow-200 text-yellow-800";
    case "positive": return "bg-green-50 border-green-200 text-green-800";
    case "info":
    default:         return "bg-blue-50 border-blue-200 text-blue-700";
  }
}

/** Icon for insight severity. */
export function insightSeverityIcon(severity: InsightSeverity): string {
  switch (severity) {
    case "critical": return "🔴";
    case "warning":  return "⚠️";
    case "positive": return "✅";
    case "info":
    default:         return "ℹ️";
  }
}

/** Format a minor-unit amount as a compact currency string (e.g. "$1.2k"). */
export function formatMinorCompact(amountMinor: number): string {
  const major = amountMinor / 100;
  if (major >= 1_000_000) return `$${(major / 1_000_000).toFixed(1)}M`;
  if (major >= 1_000) return `$${(major / 1_000).toFixed(1)}k`;
  return `$${major.toFixed(2)}`;
}

/** Format a minor-unit amount as a full currency string (e.g. "$12.50"). */
export function formatMinorFull(amountMinor: number): string {
  const major = amountMinor / 100;
  return `$${major.toFixed(2)}`;
}

/** Format a rate (0-1) as a percentage string. */
export function formatRate(rate: number): string {
  return `${(rate * 100).toFixed(1)}%`;
}
