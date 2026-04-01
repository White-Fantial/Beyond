/**
 * Human-readable labels for log types, severities, action types, and statuses
 * used throughout the Admin Logs Console.
 */

import type { AdminLogType, AdminLogSeverity } from "@/types/admin-logs";

// ─── Log type labels ──────────────────────────────────────────────────────────

export const LOG_TYPE_LABELS: Record<AdminLogType, string> = {
  AUDIT: "Audit",
  CONNECTION_ACTION: "Connection",
  WEBHOOK: "Webhook",
  ORDER_EVENT: "Order Event",
};

// ─── Severity labels ──────────────────────────────────────────────────────────

export const SEVERITY_LABELS: Record<AdminLogSeverity, string> = {
  INFO: "INFO",
  WARN: "WARN",
  ERROR: "ERROR",
};

// ─── Connection action type labels ────────────────────────────────────────────

export const CONNECTION_ACTION_TYPE_LABELS: Record<string, string> = {
  CONNECT_START: "Connect Start",
  CONNECT_CALLBACK: "Connect Callback",
  CONNECT_SUCCESS: "Connect Success",
  CONNECT_FAILURE: "Connect Failure",
  REFRESH_SUCCESS: "Refresh Success",
  REFRESH_FAILURE: "Refresh Failure",
  DISCONNECT: "Disconnect",
  REAUTHORIZE: "Reauthorize",
  STORE_MAPPING_UPDATE: "Store Mapping Update",
  SYNC_TEST: "Sync Test",
};

// ─── Order event type labels ──────────────────────────────────────────────────

export const ORDER_EVENT_TYPE_LABELS: Record<string, string> = {
  ORDER_RECEIVED: "Order Received",
  ORDER_CREATED: "Order Created",
  ORDER_UPDATED: "Order Updated",
  ORDER_STATUS_CHANGED: "Status Changed",
  POS_FORWARD_REQUESTED: "POS Forward Requested",
  POS_FORWARD_SENT: "POS Forward Sent",
  POS_FORWARD_ACCEPTED: "POS Forward Accepted",
  POS_FORWARD_FAILED: "POS Forward Failed",
  POS_RECONCILED: "POS Reconciled",
  ORDER_CANCELLED: "Order Cancelled",
  RAW_WEBHOOK_RECEIVED: "Raw Webhook Received",
  RAW_SYNC_RECEIVED: "Raw Sync Received",
};

// ─── Provider labels ──────────────────────────────────────────────────────────

export const PROVIDER_LABELS: Record<string, string> = {
  LOYVERSE: "Loyverse",
  UBER_EATS: "Uber Eats",
  DOORDASH: "DoorDash",
  STRIPE: "Stripe",
  OTHER: "Other",
};

// ─── Webhook processing status labels ────────────────────────────────────────

export const WEBHOOK_STATUS_LABELS: Record<string, string> = {
  SUCCESS: "Success",
  FAILED: "Failed",
  SKIPPED: "Skipped",
  PENDING: "Pending",
};

// ─── Generic helpers ──────────────────────────────────────────────────────────

export function getLogTypeLabel(logType: AdminLogType): string {
  return LOG_TYPE_LABELS[logType] ?? logType;
}

export function getSeverityLabel(severity: AdminLogSeverity): string {
  return SEVERITY_LABELS[severity] ?? severity;
}

export function getProviderLabel(provider: string | null | undefined): string {
  if (!provider) return "—";
  return PROVIDER_LABELS[provider] ?? provider;
}

export function getActionTypeLabel(
  logType: AdminLogType,
  actionType: string | null | undefined
): string {
  if (!actionType) return "—";
  if (logType === "CONNECTION_ACTION") {
    return CONNECTION_ACTION_TYPE_LABELS[actionType] ?? actionType;
  }
  if (logType === "ORDER_EVENT") {
    return ORDER_EVENT_TYPE_LABELS[actionType] ?? actionType;
  }
  return actionType;
}
