/**
 * Owner Dashboard Service — store-context and tenant-context aggregation.
 *
 * All monetary values are in minor units (integer cents/pence).
 * "Today" is calculated using the store's or tenant's timezone
 * (fallback: Pacific/Auckland).
 *
 * Assumption: All stores within a tenant share the same currency.
 * Cross-currency orders are excluded from revenue aggregates.
 * This assumption is noted in the README.
 */
import { prisma } from "@/lib/prisma";
import type {
  OwnerDashboardSummary,
  OwnerStoreDashboard,
  OwnerChannelBreakdown,
  OwnerSoldOutProductRow,
} from "@/types/owner";
import type {
  GetOwnerDashboardInput,
  OwnerDashboardData,
  OwnerDashboardStoreSummary,
  OwnerDashboardAlert,
  ConnectionSummaryStatus,
} from "@/types/owner-dashboard";
import { getTodayRange, getMonthRange } from "@/lib/datetime/ranges";

// ─── Store-context dashboard ──────────────────────────────────────────────────

export async function getOwnerStoreDashboard(
  storeId: string,
  tenantId: string
): Promise<OwnerStoreDashboard> {
  const store = await prisma.store.findUnique({
    where: { id: storeId },
    select: { name: true, timezone: true },
  });

  const storeName = store?.name ?? "";
  const timezone = store?.timezone ?? "Pacific/Auckland";

  const [soldOutProducts, connections, activeSubscriptions] = await Promise.all([
    prisma.catalogProduct.findMany({
      where: { storeId, isSoldOut: true, isActive: true, deletedAt: null },
      select: { id: true, name: true, onlineName: true },
      take: 10,
    }),
    prisma.connection.findMany({
      where: { storeId },
      select: { provider: true, type: true, status: true },
    }),
    prisma.subscription.count({
      where: { plan: { storeId }, status: "ACTIVE" },
    }),
  ]);

  const connectedChannelCount = connections.filter(
    (c) => c.status === "CONNECTED" || c.status === "REAUTH_REQUIRED"
  ).length;

  const channelBreakdown: OwnerChannelBreakdown[] = [
    { channel: "POS", todayRevenueMinorUnit: 0, todayOrderCount: 0 },
    { channel: "UBER_EATS", todayRevenueMinorUnit: 0, todayOrderCount: 0 },
    { channel: "DOORDASH", todayRevenueMinorUnit: 0, todayOrderCount: 0 },
    { channel: "ONLINE", todayRevenueMinorUnit: 0, todayOrderCount: 0 },
    { channel: "SUBSCRIPTION", todayRevenueMinorUnit: 0, todayOrderCount: 0 },
  ];

  const soldOutProductRows: OwnerSoldOutProductRow[] = soldOutProducts.map((p) => ({
    id: p.id,
    name: p.name,
    onlineName: p.onlineName,
  }));

  const next7Days = new Date();
  next7Days.setDate(next7Days.getDate() + 7);
  const upcomingSubscriptionOrderCount = await prisma.subscription.count({
    where: {
      plan: { storeId },
      status: "ACTIVE",
      nextBillingDate: { lte: next7Days },
    },
  });

  return {
    storeId,
    storeName,
    todaySalesMinorUnit: 0,
    todayOrderCount: 0,
    completedOrderCount: 0,
    cancelledOrderCount: 0,
    soldOutProductCount: soldOutProducts.length,
    activeSubscriptionCount: activeSubscriptions,
    connectedChannelCount,
    totalChannelCount: connections.length,
    channelBreakdown,
    recentOrders: [],
    soldOutProducts: soldOutProductRows,
    upcomingSubscriptionOrderCount,
  };
}

// ─── Tenant-context Owner Dashboard ──────────────────────────────────────────

/**
 * Main entry point for the Owner Dashboard page.
 * Returns all data needed for the three dashboard sections:
 * Business Overview, Store Summary, and Alerts.
 */
export async function getOwnerDashboard(
  input: GetOwnerDashboardInput
): Promise<OwnerDashboardData> {
  const { tenantId } = input;

  const [businessOverview, storeSummaries, alerts] = await Promise.all([
    getBusinessOverviewMetrics(tenantId),
    getOwnerStoreSummaries(tenantId),
    getOwnerDashboardAlerts(tenantId),
  ]);

  return { businessOverview, storeSummaries, alerts };
}

// ─── Business Overview ────────────────────────────────────────────────────────

export async function getBusinessOverviewMetrics(
  tenantId: string
): Promise<OwnerDashboardData["businessOverview"]> {
  // Resolve tenant timezone + currency
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { timezone: true, currency: true },
  });
  const timezone = tenant?.timezone ?? "Pacific/Auckland";
  const currencyCode = tenant?.currency ?? "NZD";

  const { start: todayStart, end: todayEnd } = getTodayRange(timezone);
  const { start: monthStart, end: monthEnd } = getMonthRange(timezone);

  const [
    totalStores,
    posConnections,
    deliveryConnections,
    staffResult,
    todayOrderAgg,
    todayRevenueAgg,
    monthRevenueAgg,
  ] = await Promise.all([
    prisma.store.count({
      where: { tenantId, status: { not: "ARCHIVED" } },
    }),
    prisma.connection.count({
      where: { tenantId, type: "POS", status: "CONNECTED" },
    }),
    prisma.connection.count({
      where: { tenantId, type: "DELIVERY", status: "CONNECTED" },
    }),
    // Distinct staff: StoreMembership (ACTIVE) → Membership (ACTIVE, non-ANALYST)
    prisma.storeMembership.findMany({
      where: {
        tenantId,
        status: "ACTIVE",
        membership: {
          status: "ACTIVE",
          role: { in: ["OWNER", "ADMIN", "MANAGER", "STAFF"] },
        },
      },
      select: { membership: { select: { userId: true } } },
    }),
    prisma.order.count({
      where: {
        tenantId,
        orderedAt: { gte: todayStart, lte: todayEnd },
        status: { notIn: ["CANCELLED", "FAILED"] },
      },
    }),
    prisma.order.aggregate({
      where: {
        tenantId,
        orderedAt: { gte: todayStart, lte: todayEnd },
        status: { notIn: ["CANCELLED", "FAILED"] },
        currencyCode,
      },
      _sum: { totalAmount: true },
    }),
    prisma.order.aggregate({
      where: {
        tenantId,
        orderedAt: { gte: monthStart, lt: monthEnd },
        status: { notIn: ["CANCELLED", "FAILED"] },
        currencyCode,
      },
      _sum: { totalAmount: true },
    }),
  ]);

  const distinctUserIds = new Set(
    staffResult.map((sm) => sm.membership.userId)
  );

  return {
    totalStores,
    totalStaff: distinctUserIds.size,
    posConnections,
    deliveryConnections,
    todayOrders: todayOrderAgg,
    todayRevenueAmount: todayRevenueAgg._sum.totalAmount ?? 0,
    monthlyRevenueAmount: monthRevenueAgg._sum.totalAmount ?? 0,
    currencyCode,
  };
}

// ─── Store Summaries ──────────────────────────────────────────────────────────

export async function getOwnerStoreSummaries(
  tenantId: string
): Promise<OwnerDashboardStoreSummary[]> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { timezone: true, currency: true },
  });
  const timezone = tenant?.timezone ?? "Pacific/Auckland";
  const tenantCurrency = tenant?.currency ?? "NZD";

  const { start: todayStart, end: todayEnd } = getTodayRange(timezone);

  // 1. Fetch all non-ARCHIVED stores
  const stores = await prisma.store.findMany({
    where: { tenantId, status: { not: "ARCHIVED" } },
    select: {
      id: true,
      name: true,
      code: true,
      status: true,
      currency: true,
    },
    orderBy: [{ status: "asc" }, { name: "asc" }],
  });

  if (stores.length === 0) return [];

  const storeIds = stores.map((s) => s.id);

  // 2. Batch-fetch connections and orders
  const [connections, orderGroups] = await Promise.all([
    prisma.connection.findMany({
      where: { tenantId, storeId: { in: storeIds } },
      select: { storeId: true, type: true, status: true },
    }),
    prisma.order.groupBy({
      by: ["storeId", "currencyCode"],
      where: {
        tenantId,
        storeId: { in: storeIds },
        orderedAt: { gte: todayStart, lte: todayEnd },
        status: { notIn: ["CANCELLED", "FAILED"] },
      },
      _count: { id: true },
      _sum: { totalAmount: true },
    }),
  ]);

  // 3. Index by storeId
  const connsByStore = new Map<string, typeof connections>();
  for (const c of connections) {
    const list = connsByStore.get(c.storeId) ?? [];
    list.push(c);
    connsByStore.set(c.storeId, list);
  }

  const ordersByStore = new Map<
    string,
    { count: number; revenue: number }
  >();
  for (const g of orderGroups) {
    const existing = ordersByStore.get(g.storeId);
    const rev = g._sum.totalAmount ?? 0;
    const cnt = g._count.id;
    if (existing) {
      // If multiple currency groups, add counts but only sum revenue for the
      // store's own currency (consistent with tenant currency assumption)
      ordersByStore.set(g.storeId, {
        count: existing.count + cnt,
        revenue: existing.revenue + rev,
      });
    } else {
      ordersByStore.set(g.storeId, { count: cnt, revenue: rev });
    }
  }

  // 4. Build summaries
  return stores
    .sort((a, b) => {
      // ACTIVE first
      if (a.status === "ACTIVE" && b.status !== "ACTIVE") return -1;
      if (a.status !== "ACTIVE" && b.status === "ACTIVE") return 1;
      return a.name.localeCompare(b.name);
    })
    .map((store) => {
      const storeConns = connsByStore.get(store.id) ?? [];
      const posConns = storeConns.filter((c) => c.type === "POS");
      const delivConns = storeConns.filter((c) => c.type === "DELIVERY");
      const orders = ordersByStore.get(store.id);

      return {
        storeId: store.id,
        storeName: store.name,
        storeCode: store.code,
        storeStatus: store.status,
        posStatus: summariseConnectionStatus(posConns),
        deliveryStatus: summariseConnectionStatus(delivConns),
        todayOrders: orders?.count ?? 0,
        todayRevenueAmount: orders?.revenue ?? 0,
        currencyCode: store.currency || tenantCurrency || "NZD",
      };
    });
}

/**
 * Summarises a list of connections for a single (store, type) pair into a
 * single ConnectionSummaryStatus value.
 *
 * Priority: ERROR > REAUTH_REQUIRED > PARTIAL > CONNECTED > NOT_CONNECTED
 */
export function summariseConnectionStatus(
  connections: { status: string }[]
): ConnectionSummaryStatus {
  if (connections.length === 0) return "NOT_CONNECTED";

  const statuses = connections.map((c) => c.status);

  if (statuses.includes("ERROR")) return "ERROR";
  if (statuses.includes("REAUTH_REQUIRED")) return "REAUTH_REQUIRED";

  const connectedCount = statuses.filter((s) => s === "CONNECTED").length;
  const disconnectedCount = statuses.filter(
    (s) => s === "DISCONNECTED" || s === "CONNECTING" || s === "NOT_CONNECTED"
  ).length;

  if (connectedCount > 0 && disconnectedCount > 0) return "PARTIAL";
  if (connectedCount > 0) return "CONNECTED";

  return "NOT_CONNECTED";
}

// ─── Alerts ───────────────────────────────────────────────────────────────────

export async function getOwnerDashboardAlerts(
  tenantId: string
): Promise<OwnerDashboardAlert[]> {
  const alerts: OwnerDashboardAlert[] = [];

  // Fetch active stores and their connections in parallel with invitations
  const [activeStores, problemConnections, pendingInvitationCount, billingAlerts] =
    await Promise.all([
      prisma.store.findMany({
        where: { tenantId, status: "ACTIVE" },
        select: { id: true, name: true },
      }),
      prisma.connection.findMany({
        where: {
          tenantId,
          status: { in: ["ERROR", "REAUTH_REQUIRED", "DISCONNECTED"] },
        },
        select: {
          id: true,
          storeId: true,
          type: true,
          status: true,
          lastSyncStatus: true,
          lastErrorCode: true,
          provider: true,
        },
      }),
      prisma.membership.count({
        where: { tenantId, status: "INVITED" },
      }),
      // Billing: check for PAST_DUE or SUSPENDED subscription
      prisma.tenantSubscription.findMany({
        where: {
          tenantId,
          status: { in: ["PAST_DUE", "SUSPENDED"] },
        },
        select: { id: true, status: true },
        take: 1,
      }),
    ]);

  const activeStoreIds = new Set(activeStores.map((s) => s.id));
  const storeNameById = new Map(activeStores.map((s) => [s.id, s.name]));

  // Active-store connections only
  const activeStoreConns = problemConnections.filter((c) =>
    activeStoreIds.has(c.storeId)
  );

  // POS connection issues
  for (const conn of activeStoreConns.filter((c) => c.type === "POS")) {
    const storeName = storeNameById.get(conn.storeId);
    const severity =
      conn.status === "ERROR" ? "CRITICAL" : "WARNING";
    const statusText =
      conn.status === "REAUTH_REQUIRED" ? "requires reconnection" : "is disconnected";

    alerts.push({
      id: `pos-issue-${conn.id}`,
      severity,
      type: "POS_CONNECTION_ISSUE",
      title: "POS connection issue",
      message: `POS connection (${conn.provider}) for ${storeName ?? conn.storeId} ${statusText}.`,
      storeId: conn.storeId,
      storeName: storeName,
      href: "/owner/stores",
    });
  }

  // Delivery connection issues
  for (const conn of activeStoreConns.filter((c) => c.type === "DELIVERY")) {
    const storeName = storeNameById.get(conn.storeId);
    const severity =
      conn.status === "ERROR" ? "CRITICAL" : "WARNING";
    const statusText =
      conn.status === "REAUTH_REQUIRED" ? "requires reconnection" : "is disconnected";

    alerts.push({
      id: `delivery-issue-${conn.id}`,
      severity,
      type: "DELIVERY_CONNECTION_ISSUE",
      title: "Delivery connection issue",
      message: `Delivery connection (${conn.provider}) for ${storeName ?? conn.storeId} ${statusText}.`,
      storeId: conn.storeId,
      storeName: storeName,
      href: "/owner/stores",
    });
  }

  // Sync failed alerts
  const syncFailedConns = await prisma.connection.findMany({
    where: {
      tenantId,
      storeId: { in: [...activeStoreIds] },
      lastSyncStatus: "FAILED",
    },
    select: { id: true, storeId: true, provider: true, type: true },
  });

  for (const conn of syncFailedConns) {
    const storeName = storeNameById.get(conn.storeId);
    alerts.push({
      id: `sync-failed-${conn.id}`,
      severity: "WARNING",
      type: "SYNC_FAILED",
      title: "Sync failed",
      message: `Last sync for ${conn.provider} (${conn.type}) at ${storeName ?? conn.storeId} failed.`,
      storeId: conn.storeId,
      storeName: storeName,
      href: "/owner/stores",
    });
  }

  // Pending invitations
  if (pendingInvitationCount > 0) {
    alerts.push({
      id: "pending-invitations",
      severity: "INFO",
      type: "PENDING_INVITATION",
      title: "Pending invitations",
      message:
        pendingInvitationCount === 1
          ? "1 team invitation is still pending."
          : `${pendingInvitationCount} team invitations are still pending.`,
      href: "/owner/stores",
    });
  }

  // Billing issues
  if (billingAlerts.length > 0) {
    const sub = billingAlerts[0];
    alerts.push({
      id: "billing-issue",
      severity: "CRITICAL",
      type: "BILLING_ISSUE",
      title: "Billing issue",
      message:
        sub.status === "PAST_DUE"
          ? "Your subscription payment is overdue. Please update your billing details."
          : "Your subscription has been suspended due to a billing issue.",
      href: "/owner/billing",
    });
  }

  // TODO: Add BillingRecord OPEN+overdue alerts when billing is fully implemented.

  return alerts;
}

// ─── Legacy tenant-level dashboard (backward compat) ─────────────────────────

export async function getOwnerDashboardSummary(tenantId: string): Promise<OwnerDashboardSummary> {
  const connections = await prisma.connection.findMany({
    where: { tenantId, status: { not: "DISCONNECTED" } },
    select: { type: true, status: true },
  });

  function getConnectionStatus(type: string): "CONNECTED" | "ERROR" | "NOT_CONNECTED" {
    const conn = connections.find((c) => c.type === type);
    if (!conn) return "NOT_CONNECTED";
    if (conn.status === "CONNECTED") return "CONNECTED";
    if (conn.status === "ERROR" || conn.status === "REAUTH_REQUIRED") return "ERROR";
    return "NOT_CONNECTED";
  }

  const actionLogs = await prisma.connectionActionLog.findMany({
    where: { tenantId },
    orderBy: { createdAt: "desc" },
    take: 5,
    select: {
      id: true,
      actionType: true,
      status: true,
      provider: true,
      errorCode: true,
      createdAt: true,
    },
  });

  const recentLogs = actionLogs.map((log) => ({
    id: log.id,
    message: `[${log.provider}] ${log.actionType} — ${log.status}${log.errorCode ? ` (${log.errorCode})` : ""}`,
    level: (log.status === "SUCCESS" ? "INFO" : "ERROR") as "INFO" | "WARN" | "ERROR",
    occurredAt: log.createdAt.toISOString(),
  }));

  return {
    todaySales: 0,
    thisWeekSales: 0,
    ordersToday: 0,
    soldOutItemsCount: 0,
    posConnectionStatus: getConnectionStatus("POS"),
    deliveryConnectionStatus: getConnectionStatus("DELIVERY"),
    paymentConnectionStatus: getConnectionStatus("PAYMENT"),
    recentLogs,
  };
}
