/**
 * Human-friendly label maps for the Owner Dashboard.
 * Centralises all status → display text mappings to avoid scattered hard-coding.
 */

import type { ConnectionSummaryStatus, AlertSeverity } from "@/types/owner-dashboard";

// ─── Store status ─────────────────────────────────────────────────────────────

export const STORE_STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Active",
  INACTIVE: "Inactive",
  ARCHIVED: "Archived",
};

export function storeStatusLabel(status: string): string {
  return STORE_STATUS_LABELS[status] ?? status;
}

// ─── Connection summary status ────────────────────────────────────────────────

export const CONNECTION_STATUS_LABELS: Record<ConnectionSummaryStatus, string> = {
  CONNECTED: "Connected",
  PARTIAL: "Partial",
  NOT_CONNECTED: "Not connected",
  ERROR: "Error",
  REAUTH_REQUIRED: "Reconnect required",
};

export function connectionStatusLabel(status: ConnectionSummaryStatus): string {
  return CONNECTION_STATUS_LABELS[status];
}

// ─── Alert severity ───────────────────────────────────────────────────────────

export const SEVERITY_LABELS: Record<AlertSeverity, string> = {
  INFO: "Info",
  WARNING: "Warning",
  CRITICAL: "Critical",
};

export function severityLabel(severity: AlertSeverity): string {
  return SEVERITY_LABELS[severity];
}

// ─── Badge colour classes ─────────────────────────────────────────────────────

export const STORE_STATUS_BADGE_CLASS: Record<string, string> = {
  ACTIVE: "bg-green-100 text-green-700",
  INACTIVE: "bg-gray-100 text-gray-500",
  ARCHIVED: "bg-gray-100 text-gray-400",
};

export const CONNECTION_STATUS_BADGE_CLASS: Record<ConnectionSummaryStatus, string> = {
  CONNECTED: "bg-green-100 text-green-700",
  PARTIAL: "bg-yellow-100 text-yellow-700",
  NOT_CONNECTED: "bg-gray-100 text-gray-500",
  ERROR: "bg-red-100 text-red-700",
  REAUTH_REQUIRED: "bg-orange-100 text-orange-700",
};

export const SEVERITY_BADGE_CLASS: Record<AlertSeverity, string> = {
  INFO: "bg-blue-100 text-blue-700",
  WARNING: "bg-yellow-100 text-yellow-700",
  CRITICAL: "bg-red-100 text-red-700",
};
