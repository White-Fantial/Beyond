/**
 * Owner Dashboard Service — store-context aggregation.
 *
 * All monetary values are in minor units (integer cents/pence).
 * "Today" is calculated using the store's timezone (fallback: Pacific/Auckland).
 */
import { prisma } from "@/lib/prisma";
import type {
  OwnerDashboardSummary,
  OwnerStoreDashboard,
  OwnerChannelBreakdown,
  OwnerSoldOutProductRow,
} from "@/types/owner";

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
