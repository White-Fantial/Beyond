/**
 * Owner Alert Evaluator Service — evaluates alert rules against live metrics
 * and emits Notification records when thresholds are crossed.
 *
 * Intended to be called on-demand from the Admin Jobs Panel or a scheduled job.
 * All metric queries are tenant-scoped; no cross-tenant data is ever combined.
 */
import { prisma } from "@/lib/prisma";
import { OrderStatus } from "@prisma/client";
import { createNotification } from "./owner-notification.service";
import type { EvaluatorResult } from "@/types/owner-notifications";

// ─── Metric evaluation helpers ────────────────────────────────────────────────

/**
 * Returns the cancellation rate (0–100) over the last `windowMinutes`.
 */
async function measureCancellationRate(
  tenantId: string,
  storeId: string | null,
  windowMinutes: number
): Promise<number> {
  const since = new Date(Date.now() - windowMinutes * 60 * 1000);
  const where = {
    tenantId,
    ...(storeId ? { storeId } : {}),
    createdAt: { gte: since },
  };
  const [total, cancelled] = await Promise.all([
    prisma.order.count({ where }),
    prisma.order.count({ where: { ...where, status: OrderStatus.CANCELLED } }),
  ]);
  if (total === 0) return 0;
  return (cancelled / total) * 100;
}

/**
 * Returns the order failure rate (0–100) over the last `windowMinutes`.
 * "Failure" means POS submission failed.
 */
async function measureOrderFailureRate(
  tenantId: string,
  storeId: string | null,
  windowMinutes: number
): Promise<number> {
  const since = new Date(Date.now() - windowMinutes * 60 * 1000);
  const where = {
    tenantId,
    ...(storeId ? { storeId } : {}),
    createdAt: { gte: since },
  };
  const [total, failed] = await Promise.all([
    prisma.order.count({ where }),
    prisma.order.count({ where: { ...where, posSubmissionStatus: "FAILED" } }),
  ]);
  if (total === 0) return 0;
  return (failed / total) * 100;
}

/**
 * Returns the number of sold-out products for the given scope.
 */
async function measureSoldOutCount(
  tenantId: string,
  storeId: string | null
): Promise<number> {
  const storeWhere = storeId ? { id: storeId, tenantId } : { tenantId };
  const stores = await prisma.store.findMany({
    where: storeWhere,
    select: { id: true },
  });
  const storeIds = stores.map((s) => s.id);
  if (storeIds.length === 0) return 0;

  return prisma.catalogProduct.count({
    where: { storeId: { in: storeIds }, isSoldOut: true },
  });
}

/**
 * Returns revenue change percentage over last `windowMinutes` compared to the
 * prior equal window. Negative means a drop; threshold is a negative percentage.
 */
async function measureRevenueDrop(
  tenantId: string,
  storeId: string | null,
  windowMinutes: number
): Promise<number> {
  const now = new Date();
  const windowMs = windowMinutes * 60 * 1000;
  const periodStart = new Date(now.getTime() - windowMs);
  const priorStart = new Date(now.getTime() - 2 * windowMs);

  const storeFilter = storeId ? { storeId } : {};
  const baseWhere = { tenantId, ...storeFilter, status: { not: OrderStatus.CANCELLED } };

  const [currentOrders, priorOrders] = await Promise.all([
    prisma.order.findMany({
      where: { ...baseWhere, createdAt: { gte: periodStart, lt: now } },
      select: { totalAmount: true },
    }),
    prisma.order.findMany({
      where: { ...baseWhere, createdAt: { gte: priorStart, lt: periodStart } },
      select: { totalAmount: true },
    }),
  ]);

  const sum = (orders: Array<{ totalAmount?: number | null; totalAmountMinor?: number | null }>) =>
    orders.reduce((acc, o) => acc + (o.totalAmount ?? o.totalAmountMinor ?? 0), 0);

  const current = sum(currentOrders);
  const prior = sum(priorOrders);
  if (prior === 0) return 0;
  return ((current - prior) / prior) * 100;
}

/**
 * Returns 1 if there is at least one disconnected POS connection for the scope,
 * 0 otherwise. Threshold should be set to 0 to trigger on any disconnect.
 */
async function measurePosDisconnect(
  tenantId: string,
  storeId: string | null
): Promise<number> {
  const storeFilter = storeId ? { storeId } : {};
  const count = await prisma.connection.count({
    where: {
      tenantId,
      ...storeFilter,
      type: "POS",
      status: { in: ["DISCONNECTED", "ERROR"] },
    },
  });
  return count;
}

/**
 * Returns 1 if there is at least one disconnected delivery connection, 0 otherwise.
 */
async function measureDeliveryDisconnect(
  tenantId: string,
  storeId: string | null
): Promise<number> {
  const storeFilter = storeId ? { storeId } : {};
  const count = await prisma.connection.count({
    where: {
      tenantId,
      ...storeFilter,
      type: "DELIVERY",
      status: { in: ["DISCONNECTED", "ERROR"] },
    },
  });
  return count;
}

/**
 * Returns the number of low-stock catalog products (isSoldOut within 24h reset).
 * Uses sold-out count as a proxy since we don't have actual stock levels.
 */
async function measureLowStockItems(
  tenantId: string,
  storeId: string | null
): Promise<number> {
  return measureSoldOutCount(tenantId, storeId);
}

// ─── Metric dispatch ──────────────────────────────────────────────────────────

async function evaluateMetric(
  metricType: string,
  tenantId: string,
  storeId: string | null,
  windowMinutes: number
): Promise<number> {
  switch (metricType) {
    case "CANCELLATION_RATE":
      return measureCancellationRate(tenantId, storeId, windowMinutes);
    case "REVENUE_DROP":
      return measureRevenueDrop(tenantId, storeId, windowMinutes);
    case "SOLD_OUT_COUNT":
      return measureSoldOutCount(tenantId, storeId);
    case "ORDER_FAILURE_RATE":
      return measureOrderFailureRate(tenantId, storeId, windowMinutes);
    case "LOW_STOCK_ITEMS":
      return measureLowStockItems(tenantId, storeId);
    case "POS_DISCONNECT":
      return measurePosDisconnect(tenantId, storeId);
    case "DELIVERY_DISCONNECT":
      return measureDeliveryDisconnect(tenantId, storeId);
    default:
      return 0;
  }
}

function buildNotificationTitle(metricType: string, value: number): string {
  switch (metricType) {
    case "CANCELLATION_RATE":
      return `High cancellation rate: ${value.toFixed(1)}%`;
    case "REVENUE_DROP":
      return `Revenue drop detected: ${Math.abs(value).toFixed(1)}% decline`;
    case "SOLD_OUT_COUNT": {
      const count = Math.round(value);
      return `${count} product${count !== 1 ? "s" : ""} sold out`;
    }
    case "ORDER_FAILURE_RATE":
      return `Order failure rate: ${value.toFixed(1)}%`;
    case "LOW_STOCK_ITEMS": {
      const count = Math.round(value);
      return `${count} low-stock item${count !== 1 ? "s" : ""} detected`;
    }
    case "POS_DISCONNECT":
      return "POS connection issue detected";
    case "DELIVERY_DISCONNECT":
      return "Delivery platform connection issue detected";
    default:
      return `Alert: ${metricType} threshold exceeded`;
  }
}

function buildNotificationBody(
  metricType: string,
  value: number,
  threshold: number,
  storeName: string | null
): string {
  const scope = storeName ? `Store: ${storeName}` : "All stores";
  switch (metricType) {
    case "CANCELLATION_RATE":
      return `${scope} — Cancellation rate of ${value.toFixed(1)}% exceeds the configured threshold of ${threshold}%.`;
    case "REVENUE_DROP":
      return `${scope} — Revenue has dropped ${Math.abs(value).toFixed(1)}% compared to the previous period (threshold: ${Math.abs(threshold)}%).`;
    case "SOLD_OUT_COUNT":
      return `${scope} — ${Math.round(value)} sold-out products exceed the threshold of ${threshold}.`;
    case "ORDER_FAILURE_RATE":
      return `${scope} — Order failure rate of ${value.toFixed(1)}% exceeds threshold of ${threshold}%.`;
    case "LOW_STOCK_ITEMS":
      return `${scope} — ${Math.round(value)} items are sold out, above the threshold of ${threshold}.`;
    case "POS_DISCONNECT":
      return `${scope} — One or more POS connections are in a disconnected or error state.`;
    case "DELIVERY_DISCONNECT":
      return `${scope} — One or more delivery platform connections are in a disconnected or error state.`;
    default:
      return `${scope} — Metric value ${value} has exceeded threshold ${threshold}.`;
  }
}

function isThresholdBreached(metricType: string, value: number, threshold: number): boolean {
  // Revenue drop uses negative threshold — breach when value is below threshold
  if (metricType === "REVENUE_DROP") return value < threshold;
  return value > threshold;
}

// ─── Main evaluator ───────────────────────────────────────────────────────────

/**
 * Evaluate all enabled alert rules for a tenant and emit notifications.
 * Optionally scoped to a specific tenantId; if omitted, all tenants are evaluated.
 */
export async function evaluateAlertRules(
  scopedTenantId?: string
): Promise<EvaluatorResult> {
  const result: EvaluatorResult = {
    rulesEvaluated: 0,
    notificationsCreated: 0,
    errors: [],
  };

  const where = {
    enabled: true,
    ...(scopedTenantId ? { tenantId: scopedTenantId } : {}),
  };

  const rules = await prisma.alertRule.findMany({
    where,
    include: {
      store: { select: { id: true, name: true } },
      tenant: { select: { id: true } },
    },
  });

  for (const rule of rules) {
    result.rulesEvaluated++;
    try {
      const value = await evaluateMetric(
        rule.metricType,
        rule.tenantId,
        rule.storeId,
        rule.windowMinutes
      );

      const threshold =
        typeof rule.threshold === "number"
          ? rule.threshold
          : (rule.threshold as { toNumber: () => number }).toNumber();

      if (!isThresholdBreached(rule.metricType, value, threshold)) continue;

      // Find all OWNER and ADMIN members of the tenant to notify
      const memberships = await prisma.membership.findMany({
        where: {
          tenantId: rule.tenantId,
          role: { in: ["OWNER", "ADMIN"] },
          status: "ACTIVE",
        },
        select: { userId: true },
      });

      const storeName = rule.store?.name ?? null;
      const title = buildNotificationTitle(rule.metricType, value);
      const body = buildNotificationBody(rule.metricType, value, threshold, storeName);

      for (const { userId } of memberships) {
        await createNotification({
          tenantId: rule.tenantId,
          userId,
          type: "ALERT_TRIGGERED",
          title,
          body,
          entityType: "AlertRule",
          entityId: rule.id,
        });
        result.notificationsCreated++;
      }

      // Update lastFiredAt
      await prisma.alertRule.update({
        where: { id: rule.id },
        data: { lastFiredAt: new Date() },
      });
    } catch (err) {
      result.errors.push(
        `Rule ${rule.id} (${rule.metricType}): ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }

  return result;
}
