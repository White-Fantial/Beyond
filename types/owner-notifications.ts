// Owner Console Phase 8 — Automation & Notifications type definitions

// ─── Enums ────────────────────────────────────────────────────────────────────

export type AlertMetricType =
  | "CANCELLATION_RATE"
  | "REVENUE_DROP"
  | "SOLD_OUT_COUNT"
  | "ORDER_FAILURE_RATE"
  | "LOW_STOCK_ITEMS"
  | "POS_DISCONNECT"
  | "DELIVERY_DISCONNECT";

export type NotificationType =
  | "ALERT_TRIGGERED"
  | "SYSTEM_INFO"
  | "BILLING_REMINDER"
  | "SUBSCRIPTION_EVENT"
  | "INTEGRATION_ISSUE"
  | "STAFF_ACTIVITY";

// ─── Alert Rules ──────────────────────────────────────────────────────────────

export interface AlertRule {
  id: string;
  tenantId: string;
  storeId: string | null;
  storeName: string | null;
  metricType: AlertMetricType;
  threshold: number;
  windowMinutes: number;
  enabled: boolean;
  lastFiredAt: string | null; // ISO 8601
  createdBy: string | null;
  createdByName: string | null;
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
}

export interface AlertRuleListResult {
  items: AlertRule[];
  total: number;
  page: number;
  pageSize: number;
}

export interface CreateAlertRuleInput {
  storeId?: string;
  metricType: AlertMetricType;
  threshold: number;
  windowMinutes?: number;
}

export interface UpdateAlertRuleInput {
  storeId?: string | null;
  metricType?: AlertMetricType;
  threshold?: number;
  windowMinutes?: number;
  enabled?: boolean;
}

// ─── Notifications ────────────────────────────────────────────────────────────

export interface Notification {
  id: string;
  tenantId: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  entityType: string | null;
  entityId: string | null;
  readAt: string | null; // ISO 8601
  dismissedAt: string | null; // ISO 8601
  createdAt: string; // ISO 8601
}

export interface NotificationListResult {
  items: Notification[];
  total: number;
  unreadCount: number;
  page: number;
  pageSize: number;
}

export interface NotificationFilters {
  unreadOnly?: boolean;
  type?: NotificationType;
  page?: number;
  pageSize?: number;
}

// ─── Evaluator ────────────────────────────────────────────────────────────────

export interface EvaluatorResult {
  rulesEvaluated: number;
  notificationsCreated: number;
  errors: string[];
}
