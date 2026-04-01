// Admin Logs Console — unified read-only view models for the Platform Admin.
// These types normalize the four log sources into a common shape for the list
// view, while keeping source-specific detail available for the detail page.

// ─── Core enums ───────────────────────────────────────────────────────────────

export type AdminLogType = "AUDIT" | "CONNECTION_ACTION" | "WEBHOOK" | "ORDER_EVENT";

export type AdminLogSeverity = "INFO" | "WARN" | "ERROR";

// ─── Unified list item ────────────────────────────────────────────────────────

export interface AdminLogListItem {
  logType: AdminLogType;
  id: string;
  occurredAt: Date;
  tenantId?: string | null;
  tenantName?: string | null;
  storeId?: string | null;
  storeName?: string | null;
  userId?: string | null;
  userLabel?: string | null;
  provider?: string | null;
  actionType?: string | null;
  status?: string | null;
  severity: AdminLogSeverity;
  title: string;
  subtitle?: string | null;
  errorCode?: string | null;
  hasSensitiveContent?: boolean;
}

// ─── Filter params ────────────────────────────────────────────────────────────

export interface AdminLogFilterParams {
  q?: string;
  logType?: string;
  from?: string;
  to?: string;
  tenantId?: string;
  storeId?: string;
  userId?: string;
  provider?: string;
  actionType?: string;
  status?: string;
  errorOnly?: string;
  targetId?: string;
  orderId?: string;
  page?: string | number;
  pageSize?: string | number;
}

// ─── Detail models (source-specific) ─────────────────────────────────────────

export interface AuditLogDetail {
  logType: "AUDIT";
  id: string;
  occurredAt: Date;
  severity: AdminLogSeverity;
  action: string;
  targetType: string;
  targetId: string;
  tenantId: string | null;
  storeId: string | null;
  actorUserId: string | null;
  actorUserName: string | null;
  actorUserEmail: string | null;
  tenantName: string | null;
  storeName: string | null;
  metadata: Record<string, unknown> | null;
}

export interface ConnectionActionLogDetail {
  logType: "CONNECTION_ACTION";
  id: string;
  occurredAt: Date;
  severity: AdminLogSeverity;
  provider: string;
  actionType: string;
  status: string;
  tenantId: string;
  storeId: string;
  tenantName: string | null;
  storeName: string | null;
  connectionId: string | null;
  actorUserId: string | null;
  message: string | null;
  errorCode: string | null;
  payload: Record<string, unknown> | null;
}

export interface WebhookLogDetail {
  logType: "WEBHOOK";
  id: string;
  occurredAt: Date;
  severity: AdminLogSeverity;
  channelType: string | null;
  eventName: string | null;
  externalEventRef: string | null;
  deliveryId: string | null;
  signatureValid: boolean | null;
  processingStatus: string;
  tenantId: string | null;
  storeId: string | null;
  tenantName: string | null;
  storeName: string | null;
  connectionId: string | null;
  processedAt: Date | null;
  errorMessage: string | null;
  requestHeaders: Record<string, unknown> | null;
  requestBody: Record<string, unknown> | null;
}

export interface OrderEventLogDetail {
  logType: "ORDER_EVENT";
  id: string;
  occurredAt: Date;
  severity: AdminLogSeverity;
  eventType: string;
  channelType: string | null;
  tenantId: string;
  storeId: string;
  tenantName: string | null;
  storeName: string | null;
  orderId: string;
  connectionId: string | null;
  message: string | null;
  payload: Record<string, unknown> | null;
}

export type AdminLogDetail =
  | AuditLogDetail
  | ConnectionActionLogDetail
  | WebhookLogDetail
  | OrderEventLogDetail;
