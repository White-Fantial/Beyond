/**
 * Admin Log Service — unified read-only log queries for the Platform Admin.
 *
 * Queries each log source independently, normalizes the results into a common
 * AdminLogListItem shape, merges by recency, and returns a paginated result.
 *
 * Detail functions return source-specific AdminLogDetail objects.
 */

import { prisma } from "@/lib/prisma";
import { buildPaginationMeta } from "@/lib/admin/filters";
import {
  normalizeAuditLogListItem,
  normalizeConnectionActionLogListItem,
  normalizeWebhookLogListItem,
  normalizeOrderEventListItem,
  normalizeAuditLogDetail,
  normalizeConnectionActionLogDetail,
  normalizeWebhookLogDetail,
  normalizeOrderEventDetail,
} from "@/lib/admin/logs/normalize";
import type { ParsedAdminLogFilters } from "@/lib/admin/logs/filters";
import type {
  AdminLogListItem,
  AdminLogDetail,
  AdminLogType,
} from "@/types/admin-logs";
import type { PaginatedResult } from "@/types/admin";

// ─── List ─────────────────────────────────────────────────────────────────────

/**
 * Query all four log sources concurrently, normalize, merge, sort, and paginate.
 *
 * Because we merge across sources in memory we fetch a window of records from
 * each source that is larger than the final page.  The window size is capped to
 * keep queries light.
 */
export async function listAdminLogs(
  filters: ParsedAdminLogFilters
): Promise<PaginatedResult<AdminLogListItem>> {
  const { logType, page, pageSize } = filters;

  // Determine which sources to query
  const querySources: AdminLogType[] = logType
    ? [logType]
    : ["AUDIT", "CONNECTION_ACTION", "WEBHOOK", "ORDER_EVENT"];

  // Per-source window: fetch enough to fill the merged page plus preceding pages
  const windowSize = page * pageSize * 2;

  const [auditRows, connectionRows, webhookRows, orderRows] = await Promise.all([
    querySources.includes("AUDIT")
      ? fetchAuditLogs(filters, windowSize)
      : Promise.resolve([]),
    querySources.includes("CONNECTION_ACTION")
      ? fetchConnectionActionLogs(filters, windowSize)
      : Promise.resolve([]),
    querySources.includes("WEBHOOK")
      ? fetchWebhookLogs(filters, windowSize)
      : Promise.resolve([]),
    querySources.includes("ORDER_EVENT")
      ? fetchOrderEvents(filters, windowSize)
      : Promise.resolve([]),
  ]);

  // Merge and sort by occurredAt descending
  const merged: AdminLogListItem[] = [
    ...auditRows,
    ...connectionRows,
    ...webhookRows,
    ...orderRows,
  ].sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime());

  // Apply errorOnly filter on merged result
  const filtered = filters.errorOnly
    ? merged.filter((item) => item.severity === "ERROR")
    : merged;

  // Estimate total (we only fetched a window, not all rows)
  // Use merged length for current window; count queries are issued separately
  const [
    auditCount,
    connectionCount,
    webhookCount,
    orderCount,
  ] = await Promise.all([
    querySources.includes("AUDIT") ? countAuditLogs(filters) : Promise.resolve(0),
    querySources.includes("CONNECTION_ACTION")
      ? countConnectionActionLogs(filters)
      : Promise.resolve(0),
    querySources.includes("WEBHOOK") ? countWebhookLogs(filters) : Promise.resolve(0),
    querySources.includes("ORDER_EVENT") ? countOrderEvents(filters) : Promise.resolve(0),
  ]);

  const totalBeforeErrorOnly = auditCount + connectionCount + webhookCount + orderCount;
  // For errorOnly we report the filtered subset size (approximate)
  const total = filters.errorOnly
    ? filtered.length + Math.max(0, totalBeforeErrorOnly - windowSize * querySources.length)
    : totalBeforeErrorOnly;

  // Slice the correct page from merged
  const items = filtered.slice(filters.skip, filters.skip + pageSize);

  return {
    items,
    pagination: buildPaginationMeta(
      filters.errorOnly ? filtered.length : total,
      page,
      pageSize
    ),
  };
}

// ─── Detail ───────────────────────────────────────────────────────────────────

export async function getAdminLogDetail(
  logType: string,
  logId: string
): Promise<AdminLogDetail | null> {
  switch (logType.toUpperCase() as AdminLogType) {
    case "AUDIT":
      return getAuditLogDetail(logId);
    case "CONNECTION_ACTION":
      return getConnectionActionLogDetail(logId);
    case "WEBHOOK":
      return getWebhookLogDetail(logId);
    case "ORDER_EVENT":
      return getOrderEventDetail(logId);
    default:
      return null;
  }
}

// ─── Source-specific fetchers ─────────────────────────────────────────────────

async function fetchAuditLogs(
  f: ParsedAdminLogFilters,
  take: number
): Promise<AdminLogListItem[]> {
  const where = buildAuditWhere(f);
  const rows = await prisma.auditLog.findMany({
    where,
    select: {
      id: true,
      action: true,
      targetType: true,
      targetId: true,
      tenantId: true,
      storeId: true,
      actorUserId: true,
      createdAt: true,
      tenant: { select: { displayName: true } },
      store: { select: { name: true } },
      actorUser: { select: { name: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
    take,
  });
  return rows.map(normalizeAuditLogListItem);
}

async function countAuditLogs(f: ParsedAdminLogFilters): Promise<number> {
  return prisma.auditLog.count({ where: buildAuditWhere(f) });
}

function buildAuditWhere(f: ParsedAdminLogFilters) {
  return {
    ...(f.tenantId ? { tenantId: f.tenantId } : {}),
    ...(f.storeId ? { storeId: f.storeId } : {}),
    ...(f.userId ? { actorUserId: f.userId } : {}),
    ...(f.actionType ? { action: f.actionType } : {}),
    ...(f.targetId ? { targetId: f.targetId } : {}),
    ...(f.from || f.to
      ? {
          createdAt: {
            ...(f.from ? { gte: f.from } : {}),
            ...(f.to ? { lte: endOfDay(f.to) } : {}),
          },
        }
      : {}),
    ...(f.q
      ? {
          OR: [
            { action: { contains: f.q, mode: "insensitive" as const } },
            { targetType: { contains: f.q, mode: "insensitive" as const } },
            { targetId: { contains: f.q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };
}

async function fetchConnectionActionLogs(
  f: ParsedAdminLogFilters,
  take: number
): Promise<AdminLogListItem[]> {
  const where = buildConnectionActionWhere(f);
  const rows = await prisma.connectionActionLog.findMany({
    where,
    select: {
      id: true,
      provider: true,
      actionType: true,
      status: true,
      tenantId: true,
      storeId: true,
      connectionId: true,
      actorUserId: true,
      message: true,
      errorCode: true,
      createdAt: true,
      connection: {
        select: {
          tenant: { select: { displayName: true } },
          store: { select: { name: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take,
  });
  return rows.map((row) =>
    normalizeConnectionActionLogListItem({
      ...row,
      provider: row.provider as string,
      actionType: row.actionType as string,
      tenant: row.connection?.tenant ?? null,
      store: row.connection?.store ?? null,
    })
  );
}

async function countConnectionActionLogs(f: ParsedAdminLogFilters): Promise<number> {
  return prisma.connectionActionLog.count({ where: buildConnectionActionWhere(f) });
}

function buildConnectionActionWhere(f: ParsedAdminLogFilters) {
  return {
    ...(f.tenantId ? { tenantId: f.tenantId } : {}),
    ...(f.storeId ? { storeId: f.storeId } : {}),
    ...(f.provider ? { provider: f.provider as never } : {}),
    ...(f.actionType ? { actionType: f.actionType as never } : {}),
    ...(f.status ? { status: f.status } : {}),
    ...(f.userId ? { actorUserId: f.userId } : {}),
    ...(f.from || f.to
      ? {
          createdAt: {
            ...(f.from ? { gte: f.from } : {}),
            ...(f.to ? { lte: endOfDay(f.to) } : {}),
          },
        }
      : {}),
    ...(f.q
      ? {
          OR: [
            { message: { contains: f.q, mode: "insensitive" as const } },
            { errorCode: { contains: f.q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };
}

async function fetchWebhookLogs(
  f: ParsedAdminLogFilters,
  take: number
): Promise<AdminLogListItem[]> {
  const where = buildWebhookWhere(f);
  const rows = await prisma.inboundWebhookLog.findMany({
    where,
    select: {
      id: true,
      channelType: true,
      eventName: true,
      processingStatus: true,
      tenantId: true,
      storeId: true,
      errorMessage: true,
      receivedAt: true,
    },
    orderBy: { receivedAt: "desc" },
    take,
  });

  // Enrich with tenant/store names
  const tenantIds = [...new Set(rows.map((r) => r.tenantId).filter(Boolean))] as string[];
  const storeIds = [...new Set(rows.map((r) => r.storeId).filter(Boolean))] as string[];
  const [tenants, stores] = await Promise.all([
    tenantIds.length
      ? prisma.tenant.findMany({
          where: { id: { in: tenantIds } },
          select: { id: true, displayName: true },
        })
      : Promise.resolve([]),
    storeIds.length
      ? prisma.store.findMany({
          where: { id: { in: storeIds } },
          select: { id: true, name: true },
        })
      : Promise.resolve([]),
  ]);
  const tenantMap = Object.fromEntries(tenants.map((t) => [t.id, t.displayName]));
  const storeMap = Object.fromEntries(stores.map((s) => [s.id, s.name]));

  return rows.map((row) =>
    normalizeWebhookLogListItem({
      ...row,
      channelType: row.channelType as string | null,
      tenant: row.tenantId ? { displayName: tenantMap[row.tenantId] ?? row.tenantId } : null,
      store: row.storeId ? { name: storeMap[row.storeId] ?? row.storeId } : null,
    })
  );
}

async function countWebhookLogs(f: ParsedAdminLogFilters): Promise<number> {
  return prisma.inboundWebhookLog.count({ where: buildWebhookWhere(f) });
}

function buildWebhookWhere(f: ParsedAdminLogFilters) {
  return {
    ...(f.tenantId ? { tenantId: f.tenantId } : {}),
    ...(f.storeId ? { storeId: f.storeId } : {}),
    ...(f.provider ? { channelType: f.provider as never } : {}),
    ...(f.status ? { processingStatus: f.status } : {}),
    ...(f.errorOnly ? { processingStatus: "FAILED" } : {}),
    ...(f.from || f.to
      ? {
          receivedAt: {
            ...(f.from ? { gte: f.from } : {}),
            ...(f.to ? { lte: endOfDay(f.to) } : {}),
          },
        }
      : {}),
    ...(f.q
      ? {
          OR: [
            { eventName: { contains: f.q, mode: "insensitive" as const } },
            { errorMessage: { contains: f.q, mode: "insensitive" as const } },
            { externalEventRef: { contains: f.q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };
}

async function fetchOrderEvents(
  f: ParsedAdminLogFilters,
  take: number
): Promise<AdminLogListItem[]> {
  const where = buildOrderEventWhere(f);
  const rows = await prisma.orderEvent.findMany({
    where,
    select: {
      id: true,
      eventType: true,
      channelType: true,
      orderId: true,
      tenantId: true,
      storeId: true,
      message: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
    take,
  });

  const tenantIds = [...new Set(rows.map((r) => r.tenantId).filter(Boolean))] as string[];
  const storeIds = [...new Set(rows.map((r) => r.storeId).filter(Boolean))] as string[];
  const [tenants, stores] = await Promise.all([
    tenantIds.length
      ? prisma.tenant.findMany({
          where: { id: { in: tenantIds } },
          select: { id: true, displayName: true },
        })
      : Promise.resolve([]),
    storeIds.length
      ? prisma.store.findMany({
          where: { id: { in: storeIds } },
          select: { id: true, name: true },
        })
      : Promise.resolve([]),
  ]);
  const tenantMap = Object.fromEntries(tenants.map((t) => [t.id, t.displayName]));
  const storeMap = Object.fromEntries(stores.map((s) => [s.id, s.name]));

  return rows.map((row) =>
    normalizeOrderEventListItem({
      ...row,
      channelType: row.channelType as string | null,
      eventType: row.eventType as string,
      tenant: { displayName: tenantMap[row.tenantId] ?? row.tenantId },
      store: { name: storeMap[row.storeId] ?? row.storeId },
    })
  );
}

async function countOrderEvents(f: ParsedAdminLogFilters): Promise<number> {
  return prisma.orderEvent.count({ where: buildOrderEventWhere(f) });
}

function buildOrderEventWhere(f: ParsedAdminLogFilters) {
  return {
    ...(f.tenantId ? { tenantId: f.tenantId } : {}),
    ...(f.storeId ? { storeId: f.storeId } : {}),
    ...(f.actionType ? { eventType: f.actionType as never } : {}),
    ...(f.orderId ? { orderId: f.orderId } : {}),
    ...(f.provider ? { channelType: f.provider as never } : {}),
    ...(f.from || f.to
      ? {
          createdAt: {
            ...(f.from ? { gte: f.from } : {}),
            ...(f.to ? { lte: endOfDay(f.to) } : {}),
          },
        }
      : {}),
    ...(f.q
      ? {
          OR: [
            { message: { contains: f.q, mode: "insensitive" as const } },
            { orderId: { contains: f.q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };
}

// ─── Detail fetchers ──────────────────────────────────────────────────────────

async function getAuditLogDetail(id: string) {
  const row = await prisma.auditLog.findUnique({
    where: { id },
    select: {
      id: true,
      action: true,
      targetType: true,
      targetId: true,
      tenantId: true,
      storeId: true,
      actorUserId: true,
      metadataJson: true,
      createdAt: true,
      tenant: { select: { displayName: true } },
      store: { select: { name: true } },
      actorUser: { select: { name: true, email: true } },
    },
  });
  if (!row) return null;
  return normalizeAuditLogDetail(row);
}

async function getConnectionActionLogDetail(id: string) {
  const row = await prisma.connectionActionLog.findUnique({
    where: { id },
    select: {
      id: true,
      provider: true,
      actionType: true,
      status: true,
      tenantId: true,
      storeId: true,
      connectionId: true,
      actorUserId: true,
      message: true,
      errorCode: true,
      payloadJson: true,
      createdAt: true,
      connection: {
        select: {
          tenant: { select: { displayName: true } },
          store: { select: { name: true } },
        },
      },
    },
  });
  if (!row) return null;
  return normalizeConnectionActionLogDetail({
    ...row,
    provider: row.provider as string,
    actionType: row.actionType as string,
    tenant: row.connection?.tenant ?? null,
    store: row.connection?.store ?? null,
  });
}

async function getWebhookLogDetail(id: string) {
  const row = await prisma.inboundWebhookLog.findUnique({
    where: { id },
    select: {
      id: true,
      channelType: true,
      eventName: true,
      externalEventRef: true,
      deliveryId: true,
      signatureValid: true,
      processingStatus: true,
      tenantId: true,
      storeId: true,
      connectionId: true,
      processedAt: true,
      errorMessage: true,
      requestHeaders: true,
      requestBody: true,
      receivedAt: true,
    },
  });
  if (!row) return null;

  const [tenant, store] = await Promise.all([
    row.tenantId
      ? prisma.tenant.findUnique({ where: { id: row.tenantId }, select: { displayName: true } })
      : Promise.resolve(null),
    row.storeId
      ? prisma.store.findUnique({ where: { id: row.storeId }, select: { name: true } })
      : Promise.resolve(null),
  ]);

  return normalizeWebhookLogDetail({
    ...row,
    channelType: row.channelType as string | null,
    tenant,
    store,
  });
}

async function getOrderEventDetail(id: string) {
  const row = await prisma.orderEvent.findUnique({
    where: { id },
    select: {
      id: true,
      eventType: true,
      channelType: true,
      orderId: true,
      tenantId: true,
      storeId: true,
      connectionId: true,
      message: true,
      payload: true,
      createdAt: true,
    },
  });
  if (!row) return null;

  const [tenant, store] = await Promise.all([
    prisma.tenant.findUnique({
      where: { id: row.tenantId },
      select: { displayName: true },
    }),
    prisma.store.findUnique({
      where: { id: row.storeId },
      select: { name: true },
    }),
  ]);

  return normalizeOrderEventDetail({
    ...row,
    channelType: row.channelType as string | null,
    eventType: row.eventType as string,
    tenant,
    store,
  });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function endOfDay(d: Date): Date {
  const end = new Date(d);
  end.setUTCHours(23, 59, 59, 999);
  return end;
}
