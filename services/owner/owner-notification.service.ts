/**
 * Owner Notification Service — tenant-scoped notifications for alert events.
 *
 * All functions enforce tenantId + userId scoping.
 */
import { prisma } from "@/lib/prisma";
import type {
  Notification,
  NotificationFilters,
  NotificationListResult,
} from "@/types/owner-notifications";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toNotification(row: {
  id: string;
  tenantId: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  entityType: string | null;
  entityId: string | null;
  readAt: Date | null;
  dismissedAt: Date | null;
  createdAt: Date;
}): Notification {
  return {
    id: row.id,
    tenantId: row.tenantId,
    userId: row.userId,
    type: row.type as Notification["type"],
    title: row.title,
    body: row.body,
    entityType: row.entityType,
    entityId: row.entityId,
    readAt: row.readAt?.toISOString() ?? null,
    dismissedAt: row.dismissedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

// ─── Public functions ─────────────────────────────────────────────────────────

/**
 * Paginated list of notifications for a user within a tenant.
 * Excludes dismissed notifications by default.
 * Returns unreadCount alongside the page.
 */
export async function listNotifications(
  tenantId: string,
  userId: string,
  filters: NotificationFilters = {}
): Promise<NotificationListResult> {
  const { unreadOnly = false, type, page = 1, pageSize = 50 } = filters;

  const baseWhere = {
    tenantId,
    userId,
    dismissedAt: null,
    ...(unreadOnly ? { readAt: null } : {}),
    ...(type ? { type } : {}),
  };

  const [rows, total, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: baseWhere,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.notification.count({ where: baseWhere }),
    prisma.notification.count({
      where: { tenantId, userId, readAt: null, dismissedAt: null },
    }),
  ]);

  return { items: rows.map(toNotification), total, unreadCount, page, pageSize };
}

/**
 * Mark a single notification as read.
 * Returns null if not found or does not belong to the user/tenant.
 */
export async function markNotificationRead(
  tenantId: string,
  userId: string,
  notificationId: string
): Promise<Notification | null> {
  const existing = await prisma.notification.findFirst({
    where: { id: notificationId, tenantId, userId },
    select: { id: true, readAt: true },
  });
  if (!existing) return null;
  if (existing.readAt) {
    // Already read — return the current state
    const row = await prisma.notification.findUnique({ where: { id: notificationId } });
    return row ? toNotification(row) : null;
  }

  const row = await prisma.notification.update({
    where: { id: notificationId },
    data: { readAt: new Date() },
  });
  return toNotification(row);
}

/**
 * Mark all unread notifications as read for a user within a tenant.
 * Returns the number of notifications updated.
 */
export async function markAllNotificationsRead(
  tenantId: string,
  userId: string
): Promise<number> {
  const result = await prisma.notification.updateMany({
    where: { tenantId, userId, readAt: null, dismissedAt: null },
    data: { readAt: new Date() },
  });
  return result.count;
}

/**
 * Dismiss a notification (soft-delete).
 * Returns false if the notification is not found or does not belong to the user.
 */
export async function dismissNotification(
  tenantId: string,
  userId: string,
  notificationId: string
): Promise<boolean> {
  const existing = await prisma.notification.findFirst({
    where: { id: notificationId, tenantId, userId },
    select: { id: true },
  });
  if (!existing) return false;

  await prisma.notification.update({
    where: { id: notificationId },
    data: { dismissedAt: new Date() },
  });
  return true;
}

/**
 * Create a notification for a user (internal helper, used by evaluator).
 */
export async function createNotification(input: {
  tenantId: string;
  userId: string;
  type: Notification["type"];
  title: string;
  body: string;
  entityType?: string;
  entityId?: string;
}): Promise<Notification> {
  const row = await prisma.notification.create({
    data: {
      tenantId: input.tenantId,
      userId: input.userId,
      type: input.type,
      title: input.title,
      body: input.body,
      entityType: input.entityType ?? null,
      entityId: input.entityId ?? null,
    },
  });
  return toNotification(row);
}
