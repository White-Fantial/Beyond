/**
 * Owner Activity Service — tenant-scoped read-only audit log queries.
 *
 * All functions enforce tenantId scoping so data from other tenants
 * is never exposed regardless of the caller's role.
 */
import { prisma } from "@/lib/prisma";
import type {
  ActivityFeedItem,
  ActivityFeedResult,
  RoleChangeEvent,
  RoleChangeResult,
  SettingsChangeEvent,
  SettingsChangeResult,
  IntegrationChangeEvent,
  IntegrationChangeResult,
  OwnerActivityFilters,
} from "@/types/owner-activity";

// Action strings that represent role / membership changes
const ROLE_CHANGE_ACTIONS = [
  "OWNER_STAFF_INVITED",
  "OWNER_STAFF_ROLE_UPDATED",
  "OWNER_STAFF_REACTIVATED",
  "OWNER_STAFF_DEACTIVATED",
  "OWNER_STAFF_REMOVED",
  "store_membership.created",
  "membership.created",
  "TENANT_MEMBERSHIP_CREATED",
  "TENANT_MEMBERSHIP_UPDATED",
  "STORE_MEMBERSHIP_CREATED",
  "STORE_MEMBERSHIP_UPDATED",
];

// Action strings that represent settings / catalog changes
const SETTINGS_CHANGE_ACTIONS = [
  "OWNER_STORE_SETTINGS_UPDATED",
  "OWNER_STORE_HOURS_UPDATED",
  "OWNER_CATEGORY_UPDATED",
  "OWNER_PRODUCT_UPDATED",
  "OWNER_MODIFIER_OPTION_UPDATED",
  "OWNER_MODIFIER_GROUP_UPDATED",
];

// Action strings that represent integration / connection changes
const INTEGRATION_CHANGE_ACTIONS = [
  "integration.connect_start",
  "integration.connected",
  "integration.disconnected",
  "connection.created",
  "connection.status_changed",
  "CONNECTION_STATUS_CHANGED",
  "connection_credential.rotated",
  "OWNER_CATALOG_SYNC_REQUESTED",
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildDateFilter(startDate?: string, endDate?: string) {
  if (!startDate && !endDate) return undefined;
  return {
    ...(startDate ? { gte: new Date(startDate) } : {}),
    ...(endDate ? { lte: new Date(endDate + "T23:59:59.999Z") } : {}),
  };
}

function toActivityFeedItem(log: {
  id: string;
  createdAt: Date;
  action: string;
  targetType: string;
  targetId: string;
  actorUserId: string | null;
  storeId: string | null;
  metadataJson: unknown;
  actorUser: { id: string; name: string; email: string } | null;
  store: { id: string; name: string } | null;
}): ActivityFeedItem {
  return {
    id: log.id,
    createdAt: log.createdAt.toISOString(),
    action: log.action,
    targetType: log.targetType,
    targetId: log.targetId,
    actorUserId: log.actorUserId,
    actorName: log.actorUser?.name ?? null,
    actorEmail: log.actorUser?.email ?? null,
    storeId: log.storeId,
    storeName: log.store?.name ?? null,
    metadata: (log.metadataJson as Record<string, unknown>) ?? null,
  };
}

const includeUserAndStore = {
  actorUser: { select: { id: true, name: true, email: true } },
  store: { select: { id: true, name: true } },
} as const;

// ─── Public functions ─────────────────────────────────────────────────────────

/**
 * Paginated list of all audit log entries for a tenant.
 * Used for the Activity Feed tab.
 */
export async function getStaffActivityFeed(
  tenantId: string,
  filters: OwnerActivityFilters
): Promise<ActivityFeedResult> {
  const { storeId, actorUserId, startDate, endDate, page = 1, pageSize = 50 } = filters;

  const where = {
    tenantId,
    ...(storeId ? { storeId } : {}),
    ...(actorUserId ? { actorUserId } : {}),
    ...(startDate || endDate ? { createdAt: buildDateFilter(startDate, endDate) } : {}),
  };

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: includeUserAndStore,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return {
    items: logs.map(toActivityFeedItem),
    total,
    page,
    pageSize,
  };
}

/**
 * Paginated list of role-change audit events for a tenant.
 * Used for the Role Changes tab.
 */
export async function getRoleChangeHistory(
  tenantId: string,
  filters: OwnerActivityFilters
): Promise<RoleChangeResult> {
  const { storeId, actorUserId, startDate, endDate, page = 1, pageSize = 50 } = filters;

  const where = {
    tenantId,
    action: { in: ROLE_CHANGE_ACTIONS },
    ...(storeId ? { storeId } : {}),
    ...(actorUserId ? { actorUserId } : {}),
    ...(startDate || endDate ? { createdAt: buildDateFilter(startDate, endDate) } : {}),
  };

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: includeUserAndStore,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.auditLog.count({ where }),
  ]);

  const items: RoleChangeEvent[] = logs.map((log) => {
    const meta = (log.metadataJson as Record<string, unknown>) ?? {};
    return {
      id: log.id,
      createdAt: log.createdAt.toISOString(),
      action: log.action,
      targetId: log.targetId,
      actorUserId: log.actorUserId,
      actorName: log.actorUser?.name ?? null,
      actorEmail: log.actorUser?.email ?? null,
      storeId: log.storeId,
      storeName: log.store?.name ?? null,
      previousRole: (meta.previousRole as string) ?? (meta.before as string) ?? null,
      newRole: (meta.newRole as string) ?? (meta.after as string) ?? (meta.role as string) ?? null,
      targetUserName: (meta.targetUserName as string) ?? null,
      targetUserEmail: (meta.targetUserEmail as string) ?? null,
    };
  });

  return { items, total, page, pageSize };
}

/**
 * Paginated list of settings-change audit events for a tenant.
 * Used for the Settings Changes tab.
 */
export async function getSettingsChangeLog(
  tenantId: string,
  filters: OwnerActivityFilters
): Promise<SettingsChangeResult> {
  const { storeId, actorUserId, startDate, endDate, page = 1, pageSize = 50 } = filters;

  const where = {
    tenantId,
    action: { in: SETTINGS_CHANGE_ACTIONS },
    ...(storeId ? { storeId } : {}),
    ...(actorUserId ? { actorUserId } : {}),
    ...(startDate || endDate ? { createdAt: buildDateFilter(startDate, endDate) } : {}),
  };

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: includeUserAndStore,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.auditLog.count({ where }),
  ]);

  const items: SettingsChangeEvent[] = logs.map((log) => ({
    id: log.id,
    createdAt: log.createdAt.toISOString(),
    action: log.action,
    category: resolveSettingsCategory(log.action),
    targetId: log.targetId,
    actorUserId: log.actorUserId,
    actorName: log.actorUser?.name ?? null,
    actorEmail: log.actorUser?.email ?? null,
    storeId: log.storeId,
    storeName: log.store?.name ?? null,
    metadata: (log.metadataJson as Record<string, unknown>) ?? null,
  }));

  return { items, total, page, pageSize };
}

/**
 * Paginated list of integration-change audit events for a tenant.
 * Used for the Integration Changes tab.
 */
export async function getIntegrationChangeLog(
  tenantId: string,
  filters: OwnerActivityFilters
): Promise<IntegrationChangeResult> {
  const { storeId, actorUserId, startDate, endDate, page = 1, pageSize = 50 } = filters;

  const where = {
    tenantId,
    action: { in: INTEGRATION_CHANGE_ACTIONS },
    ...(storeId ? { storeId } : {}),
    ...(actorUserId ? { actorUserId } : {}),
    ...(startDate || endDate ? { createdAt: buildDateFilter(startDate, endDate) } : {}),
  };

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: includeUserAndStore,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.auditLog.count({ where }),
  ]);

  const items: IntegrationChangeEvent[] = logs.map((log) => {
    const meta = (log.metadataJson as Record<string, unknown>) ?? {};
    return {
      id: log.id,
      createdAt: log.createdAt.toISOString(),
      action: log.action,
      targetId: log.targetId,
      actorUserId: log.actorUserId,
      actorName: log.actorUser?.name ?? null,
      actorEmail: log.actorUser?.email ?? null,
      storeId: log.storeId,
      storeName: log.store?.name ?? null,
      provider: (meta.provider as string) ?? null,
      metadata: meta,
    };
  });

  return { items, total, page, pageSize };
}

// ─── Private helpers ──────────────────────────────────────────────────────────

function resolveSettingsCategory(
  action: string
): SettingsChangeEvent["category"] {
  if (action === "OWNER_STORE_SETTINGS_UPDATED") return "store_profile";
  if (action === "OWNER_STORE_HOURS_UPDATED") return "store_hours";
  if (
    action === "OWNER_CATEGORY_UPDATED" ||
    action === "OWNER_PRODUCT_UPDATED" ||
    action === "OWNER_MODIFIER_OPTION_UPDATED" ||
    action === "OWNER_MODIFIER_GROUP_UPDATED"
  ) {
    return "catalog";
  }
  return "other";
}
