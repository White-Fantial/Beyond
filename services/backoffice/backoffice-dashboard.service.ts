/**
 * Backoffice Dashboard Service — Phase 1.
 *
 * Provides live KPI data for the per-store backoffice dashboard:
 * - Today's order count and revenue
 * - Active (in-flight) order count and list
 * - Sold-out product count
 * - Channel breakdown for today
 *
 * All queries are scoped to storeId.
 */

import { prisma } from "@/lib/prisma";
import type {
  BackofficeDashboardData,
  BackofficeChannelCount,
  BackofficeActiveOrder,
  BackofficeOrderChannel,
} from "@/types/backoffice";

// ─── Constants ────────────────────────────────────────────────────────────────

const ACTIVE_STATUSES = ["RECEIVED", "ACCEPTED", "IN_PROGRESS", "READY"] as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Return a Date for midnight UTC today. */
function todayUtcStart(): Date {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

/** Return a Date for end of today UTC (23:59:59.999). */
function todayUtcEnd(): Date {
  const d = new Date();
  d.setUTCHours(23, 59, 59, 999);
  return d;
}

// ─── getDashboardData ─────────────────────────────────────────────────────────

/**
 * Fetch all live KPIs for the backoffice dashboard.
 *
 * @param storeId  Store to scope the queries to.
 */
export async function getDashboardData(
  storeId: string
): Promise<BackofficeDashboardData> {
  const dayStart = todayUtcStart();
  const dayEnd = todayUtcEnd();

  const todayWhere = {
    storeId,
    orderedAt: { gte: dayStart, lte: dayEnd },
  } as const;

  // Run independent queries in parallel
  const [
    todayOrderCount,
    todayRevenue,
    activeOrderCount,
    soldOutItemCount,
    todayOrders,
    activeOrders,
  ] = await Promise.all([
    // 1. Total orders today (all statuses)
    prisma.order.count({ where: todayWhere }),

    // 2. Revenue from completed orders today
    prisma.order.aggregate({
      where: { ...todayWhere, status: "COMPLETED" },
      _sum: { totalAmount: true },
    }),

    // 3. Count of in-flight orders
    prisma.order.count({
      where: { storeId, status: { in: [...ACTIVE_STATUSES] } },
    }),

    // 4. Count of sold-out products
    prisma.catalogProduct.count({
      where: { storeId, isSoldOut: true },
    }),

    // 5. Today's orders for channel breakdown
    prisma.order.findMany({
      where: todayWhere,
      select: { sourceChannel: true },
    }),

    // 6. Active orders for the list (up to 20, oldest first)
    prisma.order.findMany({
      where: { storeId, status: { in: [...ACTIVE_STATUSES] } },
      orderBy: { orderedAt: "asc" },
      take: 20,
      select: {
        id: true,
        status: true,
        sourceChannel: true,
        orderedAt: true,
        customerName: true,
        totalAmount: true,
        currencyCode: true,
      },
    }),
  ]);

  // Build channel breakdown from today's orders
  const channelCounts = new Map<BackofficeOrderChannel, number>();
  for (const o of todayOrders) {
    const ch = (o.sourceChannel ?? "UNKNOWN") as BackofficeOrderChannel;
    channelCounts.set(ch, (channelCounts.get(ch) ?? 0) + 1);
  }
  const channelBreakdown: BackofficeChannelCount[] = Array.from(
    channelCounts.entries()
  )
    .map(([channel, orderCount]) => ({ channel, orderCount }))
    .sort((a, b) => b.orderCount - a.orderCount);

  // Derive age in minutes for each active order
  const now = new Date();
  const activeOrdersList: BackofficeActiveOrder[] = activeOrders.map((o) => ({
    id: o.id,
    status: o.status,
    sourceChannel: (o.sourceChannel ?? "UNKNOWN") as BackofficeOrderChannel,
    orderedAt: o.orderedAt.toISOString(),
    ageMinutes: Math.floor(
      (now.getTime() - o.orderedAt.getTime()) / 60_000
    ),
    customerName: o.customerName ?? null,
    totalAmount: o.totalAmount,
    currencyCode: o.currencyCode ?? "NZD",
  }));

  return {
    todayOrderCount,
    todayRevenueMinor: todayRevenue._sum.totalAmount ?? 0,
    activeOrderCount,
    soldOutItemCount,
    channelBreakdown,
    activeOrders: activeOrdersList,
    currencyCode: activeOrders[0]?.currencyCode ?? "NZD",
  };
}
