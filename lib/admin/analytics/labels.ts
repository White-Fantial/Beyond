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
  DELIVERY: "배달",
  PAYMENT: "결제",
};

export const ATTENTION_TYPE_LABELS: Record<AdminAttentionItemType, string> = {
  REAUTH_REQUIRED_CONNECTION: "Reauth Required 연결",
  REPEATED_SYNC_FAILURE: "반복 Sync 실패",
  WEBHOOK_ERROR_SPIKE: "Webhook Error 급증",
  POS_FORWARD_FAILURE_SPIKE: "Forward to POS 실패 급증",
  FAILED_JOBS_BACKLOG: "실패 작업 백로그",
  STORE_NO_RECENT_ORDERS: "Recent Orders 없는 Store",
  BILLING_FAILURE_RECENT: "최근 결제 실패",
};

export const KPI_LABELS: Record<string, string> = {
  totalOrders: "All 주문",
  completedOrders: "Completed Orders",
  grossSales: "Total Revenue",
  avgOrderValue: "평균 Order Amount",
  activeConnections: "Active Connections",
  reauthRequiredConnections: "Reauth Required 연결",
  webhookFailureRate: "Webhook 실패율",
  posForwardFailureRate: "Forward to POS 실패율",
  catalogSyncSuccessRate: "Catalog Sync 성공률",
  failedJobs: "실패 작업",
};

export const FAILURE_CATEGORY_LABELS: Record<string, string> = {
  webhook: "Webhook Failures",
  sync: "Sync 실패",
  refresh: "Token Refresh Failures",
  pos_forwarding: "Forward to POS 실패",
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
