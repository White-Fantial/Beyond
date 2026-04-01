/**
 * Display label helpers for admin analytics UI.
 */
import type { AdminAttentionItemType } from "@/types/admin-analytics";

export const PROVIDER_LABELS: Record<string, string> = {
  LOYVERSE: "Loyverse",
  UBER_EATS: "Uber Eats",
  DOORDASH: "DoorDash",
  STRIPE: "Stripe",
  OTHER: "기타",
};

export const CONNECTION_STATUS_LABELS: Record<string, string> = {
  CONNECTED: "연결됨",
  NOT_CONNECTED: "미연결",
  CONNECTING: "연결 중",
  ERROR: "오류",
  REAUTH_REQUIRED: "재인증 필요",
  DISCONNECTED: "연결 해제",
};

export const CONNECTION_TYPE_LABELS: Record<string, string> = {
  POS: "POS",
  DELIVERY: "배달",
  PAYMENT: "결제",
};

export const ATTENTION_TYPE_LABELS: Record<AdminAttentionItemType, string> = {
  REAUTH_REQUIRED_CONNECTION: "재인증 필요 연결",
  REPEATED_SYNC_FAILURE: "반복 동기화 실패",
  WEBHOOK_ERROR_SPIKE: "Webhook 오류 급증",
  POS_FORWARD_FAILURE_SPIKE: "POS 전달 실패 급증",
  FAILED_JOBS_BACKLOG: "실패 작업 백로그",
  STORE_NO_RECENT_ORDERS: "최근 주문 없는 매장",
  BILLING_FAILURE_RECENT: "최근 결제 실패",
};

export const KPI_LABELS: Record<string, string> = {
  totalOrders: "전체 주문",
  completedOrders: "완료 주문",
  grossSales: "총 매출",
  avgOrderValue: "평균 주문 금액",
  activeConnections: "활성 연결",
  reauthRequiredConnections: "재인증 필요 연결",
  webhookFailureRate: "Webhook 실패율",
  posForwardFailureRate: "POS 전달 실패율",
  catalogSyncSuccessRate: "카탈로그 동기화 성공률",
  failedJobs: "실패 작업",
};

export const FAILURE_CATEGORY_LABELS: Record<string, string> = {
  webhook: "Webhook 실패",
  sync: "동기화 실패",
  refresh: "토큰 갱신 실패",
  pos_forwarding: "POS 전달 실패",
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
