/**
 * Normalizers: convert raw Prisma rows into AdminLogListItem for the
 * unified log list, and into source-specific AdminLogDetail for the detail page.
 *
 * Sensitive data is sanitized before being included in detail payloads.
 */

import type {
  AdminLogListItem,
  AdminLogSeverity,
  AuditLogDetail,
  ConnectionActionLogDetail,
  WebhookLogDetail,
  OrderEventLogDetail,
} from "@/types/admin-logs";
import { sanitizeJsonValue } from "./sanitize";

// ─── Severity helpers ─────────────────────────────────────────────────────────

const AUDIT_ERROR_ACTIONS = new Set([
  "IMPERSONATION_DENIED",
  "impersonation.denied",
]);

const AUDIT_WARN_ACTIONS = new Set([
  "IMPERSONATION_STARTED",
  "impersonation.started",
  "IMPERSONATION_ENDED",
  "impersonation.ended",
  "USER_PLATFORM_ROLE_CHANGED",
  "USER_STATUS_CHANGED",
  "TENANT_ARCHIVED",
  "STORE_ARCHIVED",
]);

function auditSeverity(action: string): AdminLogSeverity {
  if (AUDIT_ERROR_ACTIONS.has(action)) return "ERROR";
  if (AUDIT_WARN_ACTIONS.has(action)) return "WARN";
  return "INFO";
}

function connectionActionSeverity(actionType: string, status: string): AdminLogSeverity {
  const s = status.toLowerCase();
  if (s === "failure" || s === "failed" || s === "error") return "ERROR";
  const t = actionType.toUpperCase();
  if (t.endsWith("_FAILURE") || t === "REAUTHORIZE") return "ERROR";
  if (t === "REFRESH_FAILURE" || t === "DISCONNECT") return "WARN";
  return "INFO";
}

function webhookSeverity(status: string): AdminLogSeverity {
  const s = status.toUpperCase();
  if (s === "FAILED") return "ERROR";
  if (s === "SKIPPED") return "WARN";
  return "INFO";
}

function orderEventSeverity(eventType: string): AdminLogSeverity {
  if (eventType === "POS_FORWARD_FAILED" || eventType === "ORDER_CANCELLED") return "ERROR";
  if (eventType === "POS_FORWARD_REQUESTED" || eventType === "POS_FORWARD_SENT") return "WARN";
  return "INFO";
}

// ─── AuditLog ─────────────────────────────────────────────────────────────────

export function normalizeAuditLogListItem(row: {
  id: string;
  action: string;
  targetType: string;
  targetId: string;
  tenantId: string | null;
  storeId: string | null;
  actorUserId: string | null;
  createdAt: Date;
  tenant?: { displayName: string } | null;
  store?: { name: string } | null;
  actorUser?: { name: string; email: string } | null;
}): AdminLogListItem {
  const severity = auditSeverity(row.action);
  return {
    logType: "AUDIT",
    id: row.id,
    occurredAt: row.createdAt,
    tenantId: row.tenantId,
    tenantName: row.tenant?.displayName ?? null,
    storeId: row.storeId,
    storeName: row.store?.name ?? null,
    userId: row.actorUserId,
    userLabel: row.actorUser
      ? `${row.actorUser.name} (${row.actorUser.email})`
      : null,
    actionType: row.action,
    status: null,
    severity,
    title: row.action,
    subtitle: `${row.targetType}: ${row.targetId}`,
    errorCode: null,
    hasSensitiveContent: false,
  };
}

export function normalizeAuditLogDetail(row: {
  id: string;
  action: string;
  targetType: string;
  targetId: string;
  tenantId: string | null;
  storeId: string | null;
  actorUserId: string | null;
  metadataJson: unknown;
  createdAt: Date;
  tenant?: { displayName: string } | null;
  store?: { name: string } | null;
  actorUser?: { name: string; email: string } | null;
}): AuditLogDetail {
  return {
    logType: "AUDIT",
    id: row.id,
    occurredAt: row.createdAt,
    severity: auditSeverity(row.action),
    action: row.action,
    targetType: row.targetType,
    targetId: row.targetId,
    tenantId: row.tenantId,
    storeId: row.storeId,
    actorUserId: row.actorUserId,
    actorUserName: row.actorUser?.name ?? null,
    actorUserEmail: row.actorUser?.email ?? null,
    tenantName: row.tenant?.displayName ?? null,
    storeName: row.store?.name ?? null,
    metadata: sanitizeJsonValue(row.metadataJson),
  };
}

// ─── ConnectionActionLog ──────────────────────────────────────────────────────

export function normalizeConnectionActionLogListItem(row: {
  id: string;
  provider: string;
  actionType: string;
  status: string;
  tenantId: string;
  storeId: string;
  connectionId: string | null;
  actorUserId: string | null;
  message: string | null;
  errorCode: string | null;
  createdAt: Date;
  tenant?: { displayName: string } | null;
  store?: { name: string } | null;
}): AdminLogListItem {
  const severity = connectionActionSeverity(row.actionType, row.status);
  return {
    logType: "CONNECTION_ACTION",
    id: row.id,
    occurredAt: row.createdAt,
    tenantId: row.tenantId,
    tenantName: row.tenant?.displayName ?? null,
    storeId: row.storeId,
    storeName: row.store?.name ?? null,
    userId: row.actorUserId,
    userLabel: null,
    provider: row.provider,
    actionType: row.actionType,
    status: row.status,
    severity,
    title: `${row.provider} — ${row.actionType}`,
    subtitle: row.message ?? null,
    errorCode: row.errorCode,
    hasSensitiveContent: true,
  };
}

export function normalizeConnectionActionLogDetail(row: {
  id: string;
  provider: string;
  actionType: string;
  status: string;
  tenantId: string;
  storeId: string;
  connectionId: string | null;
  actorUserId: string | null;
  message: string | null;
  errorCode: string | null;
  payloadJson: unknown;
  createdAt: Date;
  tenant?: { displayName: string } | null;
  store?: { name: string } | null;
}): ConnectionActionLogDetail {
  return {
    logType: "CONNECTION_ACTION",
    id: row.id,
    occurredAt: row.createdAt,
    severity: connectionActionSeverity(row.actionType, row.status),
    provider: row.provider,
    actionType: row.actionType,
    status: row.status,
    tenantId: row.tenantId,
    storeId: row.storeId,
    tenantName: row.tenant?.displayName ?? null,
    storeName: row.store?.name ?? null,
    connectionId: row.connectionId,
    actorUserId: row.actorUserId,
    message: row.message,
    errorCode: row.errorCode,
    payload: sanitizeJsonValue(row.payloadJson),
  };
}

// ─── InboundWebhookLog ────────────────────────────────────────────────────────

export function normalizeWebhookLogListItem(row: {
  id: string;
  channelType: string | null;
  eventName: string | null;
  processingStatus: string;
  tenantId: string | null;
  storeId: string | null;
  errorMessage: string | null;
  receivedAt: Date;
  tenant?: { displayName: string } | null;
  store?: { name: string } | null;
}): AdminLogListItem {
  const severity = webhookSeverity(row.processingStatus);
  return {
    logType: "WEBHOOK",
    id: row.id,
    occurredAt: row.receivedAt,
    tenantId: row.tenantId,
    tenantName: row.tenant?.displayName ?? null,
    storeId: row.storeId,
    storeName: row.store?.name ?? null,
    userId: null,
    userLabel: null,
    provider: row.channelType,
    actionType: row.eventName,
    status: row.processingStatus,
    severity,
    title: `Webhook — ${row.channelType ?? "unknown"} / ${row.eventName ?? "unknown event"}`,
    subtitle: row.errorMessage ?? null,
    errorCode: null,
    hasSensitiveContent: true,
  };
}

export function normalizeWebhookLogDetail(row: {
  id: string;
  channelType: string | null;
  eventName: string | null;
  externalEventRef: string | null;
  deliveryId: string | null;
  signatureValid: boolean | null;
  processingStatus: string;
  tenantId: string | null;
  storeId: string | null;
  connectionId: string | null;
  processedAt: Date | null;
  errorMessage: string | null;
  requestHeaders: unknown;
  requestBody: unknown;
  receivedAt: Date;
  tenant?: { displayName: string } | null;
  store?: { name: string } | null;
}): WebhookLogDetail {
  return {
    logType: "WEBHOOK",
    id: row.id,
    occurredAt: row.receivedAt,
    severity: webhookSeverity(row.processingStatus),
    channelType: row.channelType,
    eventName: row.eventName,
    externalEventRef: row.externalEventRef,
    deliveryId: row.deliveryId,
    signatureValid: row.signatureValid,
    processingStatus: row.processingStatus,
    tenantId: row.tenantId,
    storeId: row.storeId,
    tenantName: row.tenant?.displayName ?? null,
    storeName: row.store?.name ?? null,
    connectionId: row.connectionId,
    processedAt: row.processedAt,
    errorMessage: row.errorMessage,
    requestHeaders: sanitizeJsonValue(row.requestHeaders),
    requestBody: sanitizeJsonValue(row.requestBody),
  };
}

// ─── OrderEvent ───────────────────────────────────────────────────────────────

export function normalizeOrderEventListItem(row: {
  id: string;
  eventType: string;
  channelType: string | null;
  orderId: string;
  tenantId: string;
  storeId: string;
  message: string | null;
  createdAt: Date;
  tenant?: { displayName: string } | null;
  store?: { name: string } | null;
}): AdminLogListItem {
  const severity = orderEventSeverity(row.eventType);
  return {
    logType: "ORDER_EVENT",
    id: row.id,
    occurredAt: row.createdAt,
    tenantId: row.tenantId,
    tenantName: row.tenant?.displayName ?? null,
    storeId: row.storeId,
    storeName: row.store?.name ?? null,
    userId: null,
    userLabel: null,
    provider: row.channelType,
    actionType: row.eventType,
    status: null,
    severity,
    title: `Order — ${row.eventType}`,
    subtitle: row.message ?? `Order ${row.orderId.slice(0, 8)}…`,
    errorCode: null,
    hasSensitiveContent: false,
  };
}

export function normalizeOrderEventDetail(row: {
  id: string;
  eventType: string;
  channelType: string | null;
  orderId: string;
  tenantId: string;
  storeId: string;
  connectionId: string | null;
  message: string | null;
  payload: unknown;
  createdAt: Date;
  tenant?: { displayName: string } | null;
  store?: { name: string } | null;
}): OrderEventLogDetail {
  return {
    logType: "ORDER_EVENT",
    id: row.id,
    occurredAt: row.createdAt,
    severity: orderEventSeverity(row.eventType),
    eventType: row.eventType,
    channelType: row.channelType,
    tenantId: row.tenantId,
    storeId: row.storeId,
    tenantName: row.tenant?.displayName ?? null,
    storeName: row.store?.name ?? null,
    orderId: row.orderId,
    connectionId: row.connectionId,
    message: row.message,
    payload: sanitizeJsonValue(row.payload),
  };
}
