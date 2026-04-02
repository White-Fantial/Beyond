/**
 * Display label helpers for admin analytics UI.
 */
import type { AdminAttentionItemType } from "@/types/admin-analytics";

export const PROVIDER_LABELS: Record<string, string> = {
  LOYVERSE: "Loyverse",
  UBER_EATS: "Uber Eats",
  DOORDASH: "DoorDash",
  STRIPE: "Stripe",
  OTHER: "Other",
};

export const CONNECTION_STATUS_LABELS: Record<string, string> = {
  CONNECTED: "Connected",
  NOT_CONNECTED: "Not Connected",
  CONNECTING: "Connecting",
  ERROR: "Error",
  REAUTH_REQUIRED: "Reauth Required",
  DISCONNECTED: "Disconnect",
};

export const CONNECTION_TYPE_LABELS: Record<string, string> = {
  POS: "POS",
  DELIVERY: "Delivery",
  PAYMENT: "Payment",
};

export const ATTENTION_TYPE_LABELS: Record<AdminAttentionItemType, string> = {
  REAUTH_REQUIRED_CONNECTION: "Reauth Required Connection",
  REPEATED_SYNC_FAILURE: "Repeated Sync Failure",
  WEBHOOK_ERROR_SPIKE: "Webhook Error Spike",
  POS_FORWARD_FAILURE_SPIKE: "POS Forward Failure Spike",
  FAILED_JOBS_BACKLOG: "Failed Jobs Backlog",
  STORE_NO_RECENT_ORDERS: "Store No Recent Orders",
  BILLING_FAILURE_RECENT: "Recent Billing Failure",
};

export const KPI_LABELS: Record<string, string> = {
  totalOrders: "Total Orders",
  completedOrders: "Completed Orders",
  grossSales: "Total Revenue",
  avgOrderValue: "Avg. Order Value",
  activeConnections: "Active Connections",
  reauthRequiredConnections: "Reauth Required Connections",
  webhookFailureRate: "Webhook Failure Rate",
  posForwardFailureRate: "POS Forward Failure Rate",
  catalogSyncSuccessRate: "Catalog Sync Success Rate",
  failedJobs: "Failed Jobs",
};

export const FAILURE_CATEGORY_LABELS: Record<string, string> = {
  webhook: "Webhook Failures",
  sync: "Sync Failed",
  refresh: "Token Refresh Failures",
  pos_forwarding: "POS Forward Failed",
};

export function formatDelta(delta: number): string {
  if (delta === 0) return "0%";
  const sign = delta > 0 ? "+" : "";
  return `${sign}${delta.toFixed(1)}%`;
}

export function getDeltaColor(delta: number, inverseGood = false): string {
  if (delta === 0) return "text-gray-500";
  const positive = delta > 0;
  // For failure rates, positive delta is bad (inverseGood = true)
  const isGood = inverseGood ? !positive : positive;
  return isGood ? "text-green-600" : "text-red-600";
}

export function getProviderLabel(provider: string): string {
  return PROVIDER_LABELS[provider] ?? provider;
}

export function getConnectionStatusLabel(status: string): string {
  return CONNECTION_STATUS_LABELS[status] ?? status;
}

export function getAttentionTypeLabel(type: AdminAttentionItemType): string {
  return ATTENTION_TYPE_LABELS[type] ?? type;
}
