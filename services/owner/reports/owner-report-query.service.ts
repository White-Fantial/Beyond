/**
 * Owner Report Query Service — low-level Prisma aggregations for reports.
 *
 * All monetary values stay in minor units.
 * All queries are scoped to tenant/store and filter-aware.
 * No UI formatting is performed here.
 */

import { prisma } from "@/lib/prisma";
import type { OrderStatus } from "@prisma/client";
import type {
  OwnerSummaryKpi,
  OwnerRevenueTrendPoint,
  OwnerChannelBreakdownItem,
  OwnerStoreComparisonItem,
  OwnerProductPerformanceItem,
  OwnerCategoryPerformanceItem,
  OwnerSubscriptionSummary,
  OwnerOrderHealthSummary,
  OwnerSoldOutImpactSummary,
  OrderSourceChannel,
} from "@/types/owner-reports";
import {
  generateDateKeys,
  formatDateKey,
} from "@/lib/owner/reports/filters";

// ─── Shared types ─────────────────────────────────────────────────────────────

export interface QueryInput {
  tenantId: string;
  storeId?: string;
  storeIds?: string[];
  from: Date;
  to: Date;
  channels?: OrderSourceChannel[];
  currencyCode: string;
  timezone: string;
}

const REVENUE_EXCLUDED_STATUSES: OrderStatus[] = ["CANCELLED", "FAILED"];

// ─── Summary KPI ──────────────────────────────────────────────────────────────

export async function querySummaryKpi(input: QueryInput): Promise<OwnerSummaryKpi> {
  const { tenantId, storeId, storeIds, from, to, channels, currencyCode } = input;

  const storeFilter = buildStoreFilter(storeId, storeIds);
  const channelFilter = channels?.length ? { in: channels } : undefined;

  const [totalCount, completedCount, cancelledCount, revenueAgg, subRevenueAgg, subOrderCount] =
    await Promise.all([
      // Total orders
      prisma.order.count({
        where: {
          tenantId,
          ...storeFilter,
          orderedAt: { gte: from, lte: to },
          ...(channelFilter ? { sourceChannel: channelFilter } : {}),
        },
      }),
      // Completed
      prisma.order.count({
        where: {
          tenantId,
          ...storeFilter,
          status: "COMPLETED",
          orderedAt: { gte: from, lte: to },
          ...(channelFilter ? { sourceChannel: channelFilter } : {}),
        },
      }),
      // Cancelled
      prisma.order.count({
        where: {
          tenantId,
          ...storeFilter,
          status: "CANCELLED",
          orderedAt: { gte: from, lte: to },
          ...(channelFilter ? { sourceChannel: channelFilter } : {}),
        },
      }),
      // Revenue (excl cancelled/failed, currency-matched)
      prisma.order.aggregate({
        where: {
          tenantId,
          ...storeFilter,
          status: { notIn: REVENUE_EXCLUDED_STATUSES },
          orderedAt: { gte: from, lte: to },
          currencyCode,
          ...(channelFilter ? { sourceChannel: channelFilter } : {}),
        },
        _sum: { totalAmount: true },
      }),
      // Subscription revenue
      prisma.order.aggregate({
        where: {
          tenantId,
          ...storeFilter,
          sourceChannel: "SUBSCRIPTION",
          status: { notIn: REVENUE_EXCLUDED_STATUSES },
          orderedAt: { gte: from, lte: to },
          currencyCode,
        },
        _sum: { totalAmount: true },
      }),
      // Subscription order count
      prisma.order.count({
        where: {
          tenantId,
          ...storeFilter,
          sourceChannel: "SUBSCRIPTION",
          orderedAt: { gte: from, lte: to },
        },
      }),
    ]);

  const grossRevenueMinor = revenueAgg._sum.totalAmount ?? 0;
  const subscriptionRevenueMinor = subRevenueAgg._sum.totalAmount ?? 0;

  return {
    grossRevenueMinor,
    orderCount: totalCount,
    averageOrderValueMinor: totalCount > 0 ? Math.round(grossRevenueMinor / totalCount) : 0,
    completedOrderCount: completedCount,
    cancelledOrderCount: cancelledCount,
    completedRate: totalCount > 0 ? completedCount / totalCount : 0,
    cancelledRate: totalCount > 0 ? cancelledCount / totalCount : 0,
    subscriptionRevenueMinor,
    subscriptionOrderCount: subOrderCount,
    currencyCode,
  };
}

// ─── Revenue trend ────────────────────────────────────────────────────────────

export async function queryRevenueTrend(input: QueryInput): Promise<OwnerRevenueTrendPoint[]> {
  const { tenantId, storeId, storeIds, from, to, channels, currencyCode, timezone } = input;
  const storeFilter = buildStoreFilter(storeId, storeIds);
  const channelFilter = channels?.length ? { in: channels } : undefined;

  // Get all orders in range, then group in-memory by date key
  const orders = await prisma.order.findMany({
    where: {
      tenantId,
      ...storeFilter,
      orderedAt: { gte: from, lte: to },
      ...(channelFilter ? { sourceChannel: channelFilter } : {}),
    },
    select: {
      orderedAt: true,
      status: true,
      totalAmount: true,
      currencyCode: true,
    },
    orderBy: { orderedAt: "asc" },
  });

  // Generate all date keys in the range
  const allKeys = generateDateKeys(from, to, timezone);
  const pointMap = new Map<string, OwnerRevenueTrendPoint>();

  for (const key of allKeys) {
    const [y, m, d] = key.split("-");
    const date = new Date(`${y}-${m}-${d}T00:00:00Z`);
    const label = date.toLocaleDateString("en-NZ", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
    pointMap.set(key, {
      dateKey: key,
      dateLabel: label,
      revenueMinor: 0,
      orderCount: 0,
      completedOrderCount: 0,
      cancelledOrderCount: 0,
    });
  }

  for (const order of orders) {
    const key = formatDateKey(order.orderedAt, timezone);
    const point = pointMap.get(key);
    if (!point) continue;

    point.orderCount += 1;
    if (order.status === "COMPLETED") point.completedOrderCount += 1;
    if (order.status === "CANCELLED") point.cancelledOrderCount += 1;
    if (!REVENUE_EXCLUDED_STATUSES.includes(order.status as "CANCELLED" | "FAILED") && order.currencyCode === currencyCode) {
      point.revenueMinor += order.totalAmount;
    }
  }

  return allKeys.map((key) => pointMap.get(key)!);
}

// ─── Channel breakdown ────────────────────────────────────────────────────────

export async function queryChannelBreakdown(input: QueryInput): Promise<OwnerChannelBreakdownItem[]> {
  const { tenantId, storeId, storeIds, from, to, channels, currencyCode } = input;
  const storeFilter = buildStoreFilter(storeId, storeIds);
  const channelFilter = channels?.length ? { in: channels } : undefined;

  const orders = await prisma.order.findMany({
    where: {
      tenantId,
      ...storeFilter,
      orderedAt: { gte: from, lte: to },
      ...(channelFilter ? { sourceChannel: channelFilter } : {}),
    },
    select: {
      sourceChannel: true,
      status: true,
      totalAmount: true,
      currencyCode: true,
    },
  });

  const channelMap = new Map<string, {
    revenueMinor: number;
    orderCount: number;
    completedCount: number;
    cancelledCount: number;
  }>();

  for (const order of orders) {
    const ch = order.sourceChannel as string;
    if (!channelMap.has(ch)) {
      channelMap.set(ch, { revenueMinor: 0, orderCount: 0, completedCount: 0, cancelledCount: 0 });
    }
    const entry = channelMap.get(ch)!;
    entry.orderCount += 1;
    if (order.status === "COMPLETED") entry.completedCount += 1;
    if (order.status === "CANCELLED") entry.cancelledCount += 1;
    if (!REVENUE_EXCLUDED_STATUSES.includes(order.status as "CANCELLED" | "FAILED") && order.currencyCode === currencyCode) {
      entry.revenueMinor += order.totalAmount;
    }
  }

  return Array.from(channelMap.entries()).map(([channel, data]) => ({
    channel: channel as OrderSourceChannel,
    revenueMinor: data.revenueMinor,
    orderCount: data.orderCount,
    averageOrderValueMinor: data.orderCount > 0 ? Math.round(data.revenueMinor / data.orderCount) : 0,
    completedRate: data.orderCount > 0 ? data.completedCount / data.orderCount : 0,
    cancelledRate: data.orderCount > 0 ? data.cancelledCount / data.orderCount : 0,
  })).sort((a, b) => b.revenueMinor - a.revenueMinor);
}

// ─── Store comparison (tenant-level) ─────────────────────────────────────────

export async function queryStoreComparison(input: QueryInput): Promise<OwnerStoreComparisonItem[]> {
  const { tenantId, storeIds, from, to, currencyCode } = input;

  // Get all active (non-archived) stores for tenant
  const stores = await prisma.store.findMany({
    where: {
      tenantId,
      status: { not: "ARCHIVED" },
      ...(storeIds?.length ? { id: { in: storeIds } } : {}),
    },
    select: { id: true, name: true },
  });

  const results = await Promise.all(
    stores.map(async (store) => {
      const [orders, connections, activeSubs] = await Promise.all([
        prisma.order.findMany({
          where: {
            tenantId,
            storeId: store.id,
            orderedAt: { gte: from, lte: to },
          },
          select: { status: true, totalAmount: true, currencyCode: true },
        }),
        prisma.connection.count({
          where: {
            storeId: store.id,
            status: { in: ["CONNECTED", "REAUTH_REQUIRED"] },
          },
        }),
        prisma.subscription.count({
          where: { plan: { storeId: store.id }, status: "ACTIVE" },
        }),
      ]);

      let revenueMinor = 0;
      let orderCount = 0;
      let cancelledCount = 0;

      for (const order of orders) {
        orderCount += 1;
        if (order.status === "CANCELLED") cancelledCount += 1;
        if (!REVENUE_EXCLUDED_STATUSES.includes(order.status as "CANCELLED" | "FAILED") && order.currencyCode === currencyCode) {
          revenueMinor += order.totalAmount;
        }
      }

      return {
        storeId: store.id,
        storeName: store.name,
        revenueMinor,
        orderCount,
        averageOrderValueMinor: orderCount > 0 ? Math.round(revenueMinor / orderCount) : 0,
        connectedChannelCount: connections,
        activeSubscriptionCount: activeSubs,
        cancelledRate: orderCount > 0 ? cancelledCount / orderCount : 0,
        currencyCode,
      };
    })
  );

  return results.sort((a, b) => b.revenueMinor - a.revenueMinor);
}

// ─── Top products ─────────────────────────────────────────────────────────────

export async function queryTopProducts(
  input: QueryInput,
  limit = 20
): Promise<OwnerProductPerformanceItem[]> {
  const { tenantId, storeId, storeIds, from, to, currencyCode } = input;
  const storeFilter = buildStoreFilter(storeId, storeIds);

  // Aggregate order items grouped by productId
  const items = await prisma.orderItem.findMany({
    where: {
      tenantId,
      ...storeFilter,
      order: {
        orderedAt: { gte: from, lte: to },
        status: { notIn: REVENUE_EXCLUDED_STATUSES },
        currencyCode,
      },
      productId: { not: null },
    },
    select: {
      productId: true,
      productName: true,
      quantity: true,
      totalPriceAmount: true,
    },
  });

  // Aggregate by productId
  const productMap = new Map<string, {
    productName: string;
    quantitySold: number;
    revenueMinor: number;
    orderCount: number;
  }>();

  for (const item of items) {
    if (!item.productId) continue;
    if (!productMap.has(item.productId)) {
      productMap.set(item.productId, {
        productName: item.productName,
        quantitySold: 0,
        revenueMinor: 0,
        orderCount: 0,
      });
    }
    const entry = productMap.get(item.productId)!;
    entry.quantitySold += item.quantity;
    entry.revenueMinor += item.totalPriceAmount;
    entry.orderCount += 1;
  }

  // Sort by revenue, take top N
  const topIds = Array.from(productMap.entries())
    .sort((a, b) => b[1].revenueMinor - a[1].revenueMinor)
    .slice(0, limit)
    .map(([id]) => id);

  if (topIds.length === 0) return [];

  // Fetch current product metadata
  const products = await prisma.catalogProduct.findMany({
    where: { id: { in: topIds }, tenantId, deletedAt: null },
    select: {
      id: true,
      isSoldOut: true,
      isVisibleOnSubscription: true,
      productCategories: {
        where: { isPrimary: true },
        take: 1,
        select: {
          category: { select: { name: true } },
        },
      },
    },
  });

  const productMeta = new Map(products.map((p) => [
    p.id,
    {
      isSoldOut: p.isSoldOut,
      isSubscriptionEligible: p.isVisibleOnSubscription,
      categoryName: p.productCategories[0]?.category?.name ?? null,
    },
  ]));

  return topIds.map((id) => {
    const agg = productMap.get(id)!;
    const meta = productMeta.get(id);
    return {
      productId: id,
      productName: agg.productName,
      categoryName: meta?.categoryName ?? null,
      quantitySold: agg.quantitySold,
      revenueMinor: agg.revenueMinor,
      orderCount: agg.orderCount,
      soldOutFlag: meta?.isSoldOut ?? false,
      isSubscriptionEligible: meta?.isSubscriptionEligible ?? false,
    };
  });
}

// ─── Category performance ─────────────────────────────────────────────────────

export async function queryCategoryPerformance(
  input: QueryInput
): Promise<OwnerCategoryPerformanceItem[]> {
  const { tenantId, storeId, from, to, currencyCode } = input;

  if (!storeId) return [];

  const items = await prisma.orderItem.findMany({
    where: {
      tenantId,
      storeId,
      order: {
        orderedAt: { gte: from, lte: to },
        status: { notIn: REVENUE_EXCLUDED_STATUSES },
        currencyCode,
      },
      productId: { not: null },
    },
    select: {
      productId: true,
      quantity: true,
      totalPriceAmount: true,
    },
  });

  if (items.length === 0) return [];

  const productIds = [...new Set(items.map((i) => i.productId!).filter(Boolean))];

  // Get category mappings
  const categoryLinks = await prisma.catalogProductCategory.findMany({
    where: { productId: { in: productIds }, storeId },
    select: {
      productId: true,
      category: { select: { id: true, name: true, isActive: true } },
    },
  });

  const productToCategory = new Map<string, { id: string; name: string }>();
  for (const link of categoryLinks) {
    if (link.category.isActive && !productToCategory.has(link.productId)) {
      productToCategory.set(link.productId, { id: link.category.id, name: link.category.name });
    }
  }

  const catMap = new Map<string, {
    categoryName: string;
    quantitySold: number;
    revenueMinor: number;
    orderCount: number;
  }>();

  for (const item of items) {
    if (!item.productId) continue;
    const cat = productToCategory.get(item.productId);
    if (!cat) continue;

    if (!catMap.has(cat.id)) {
      catMap.set(cat.id, { categoryName: cat.name, quantitySold: 0, revenueMinor: 0, orderCount: 0 });
    }
    const entry = catMap.get(cat.id)!;
    entry.quantitySold += item.quantity;
    entry.revenueMinor += item.totalPriceAmount;
    entry.orderCount += 1;
  }

  return Array.from(catMap.entries())
    .map(([id, data]) => ({
      categoryId: id,
      categoryName: data.categoryName,
      quantitySold: data.quantitySold,
      revenueMinor: data.revenueMinor,
      orderCount: data.orderCount,
    }))
    .sort((a, b) => b.revenueMinor - a.revenueMinor);
}

// ─── Subscription summary ─────────────────────────────────────────────────────

export async function querySubscriptionSummary(input: QueryInput): Promise<OwnerSubscriptionSummary> {
  const { tenantId, storeId, storeIds, from, to, currencyCode } = input;
  const storeFilter = buildStoreFilter(storeId, storeIds);

  // For store-level: plan.storeId = storeId
  // For tenant-level: plan.store.tenantId = tenantId
  const planStoreFilter = storeId
    ? { plan: { storeId } }
    : storeIds?.length
    ? { plan: { storeId: { in: storeIds } } }
    : { plan: { store: { tenantId } } };

  const now = new Date();
  const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const [activeSubs, pausedSubs, upcoming7d, upcoming30d, subRevenue, subOrderCount] = await Promise.all([
    prisma.subscription.count({ where: { ...planStoreFilter, status: "ACTIVE" } }),
    prisma.subscription.count({ where: { ...planStoreFilter, status: "PAUSED" } }),
    // Upcoming 7d: active subscriptions with nextBillingDate <= 7d
    prisma.subscription.findMany({
      where: { ...planStoreFilter, status: "ACTIVE", nextBillingDate: { gte: now, lte: sevenDaysLater } },
      select: { plan: { select: { price: true } } },
    }),
    // Upcoming 30d: active subscriptions with nextBillingDate <= 30d
    prisma.subscription.findMany({
      where: { ...planStoreFilter, status: "ACTIVE", nextBillingDate: { gte: now, lte: thirtyDaysLater } },
      select: { plan: { select: { price: true } } },
    }),
    // Subscription revenue in range
    prisma.order.aggregate({
      where: {
        tenantId,
        ...storeFilter,
        sourceChannel: "SUBSCRIPTION",
        status: { notIn: REVENUE_EXCLUDED_STATUSES },
        orderedAt: { gte: from, lte: to },
        currencyCode,
      },
      _sum: { totalAmount: true },
    }),
    prisma.order.count({
      where: {
        tenantId,
        ...storeFilter,
        sourceChannel: "SUBSCRIPTION",
        orderedAt: { gte: from, lte: to },
      },
    }),
  ]);

  const estimated7d = upcoming7d.reduce((sum, s) => sum + s.plan.price, 0);
  const estimated30d = upcoming30d.reduce((sum, s) => sum + s.plan.price, 0);

  return {
    activeSubscriptionCount: activeSubs,
    pausedSubscriptionCount: pausedSubs,
    estimatedUpcoming7dRevenueMinor: estimated7d,
    estimatedUpcoming30dRevenueMinor: estimated30d,
    subscriptionRevenueMinor: subRevenue._sum.totalAmount ?? 0,
    subscriptionOrderCount: subOrderCount,
  };
}

// ─── Order health (store-level) ───────────────────────────────────────────────

export async function queryOrderHealth(input: QueryInput): Promise<OwnerOrderHealthSummary> {
  const { tenantId, storeId, from, to, channels } = input;
  if (!storeId) {
    return { totalOrders: 0, completedOrders: 0, cancelledOrders: 0, failedOrders: 0, completedRate: 0, cancelledRate: 0, failedRate: 0 };
  }

  const channelFilter = channels?.length ? { sourceChannel: { in: channels } } : {};

  const [total, completed, cancelled, failed] = await Promise.all([
    prisma.order.count({ where: { tenantId, storeId, orderedAt: { gte: from, lte: to }, ...channelFilter } }),
    prisma.order.count({ where: { tenantId, storeId, status: "COMPLETED", orderedAt: { gte: from, lte: to }, ...channelFilter } }),
    prisma.order.count({ where: { tenantId, storeId, status: "CANCELLED", orderedAt: { gte: from, lte: to }, ...channelFilter } }),
    prisma.order.count({ where: { tenantId, storeId, status: "FAILED", orderedAt: { gte: from, lte: to }, ...channelFilter } }),
  ]);

  return {
    totalOrders: total,
    completedOrders: completed,
    cancelledOrders: cancelled,
    failedOrders: failed,
    completedRate: total > 0 ? completed / total : 0,
    cancelledRate: total > 0 ? cancelled / total : 0,
    failedRate: total > 0 ? failed / total : 0,
  };
}

// ─── Sold-out impact ─────────────────────────────────────────────────────────

export async function querySoldOutImpact(input: QueryInput): Promise<OwnerSoldOutImpactSummary> {
  const { tenantId, storeId, from, to, currencyCode } = input;
  if (!storeId) {
    return { soldOutProductCount: 0, soldOutOptionCount: 0, topSoldOutProducts: [] };
  }

  const [soldOutProducts, soldOutOptions] = await Promise.all([
    prisma.catalogProduct.findMany({
      where: { storeId, tenantId, isSoldOut: true, isActive: true, deletedAt: null },
      select: { id: true, name: true },
    }),
    prisma.catalogModifierOption.count({
      where: { storeId, tenantId, isSoldOut: true, isActive: true, deletedAt: null },
    }),
  ]);

  if (soldOutProducts.length === 0) {
    return { soldOutProductCount: 0, soldOutOptionCount: soldOutOptions, topSoldOutProducts: [] };
  }

  // Find which sold-out products also have recent sales
  const soldOutIds = soldOutProducts.map((p) => p.id);

  const recentSalesItems = await prisma.orderItem.findMany({
    where: {
      tenantId,
      storeId,
      productId: { in: soldOutIds },
      order: {
        orderedAt: { gte: from, lte: to },
        status: { notIn: REVENUE_EXCLUDED_STATUSES },
        currencyCode,
      },
    },
    select: { productId: true, quantity: true },
  });

  const salesMap = new Map<string, number>();
  for (const item of recentSalesItems) {
    if (!item.productId) continue;
    salesMap.set(item.productId, (salesMap.get(item.productId) ?? 0) + item.quantity);
  }

  const topSoldOutProducts = soldOutProducts
    .map((p) => ({ productId: p.id, productName: p.name, recentSales: salesMap.get(p.id) ?? 0 }))
    .filter((p) => p.recentSales > 0)
    .sort((a, b) => b.recentSales - a.recentSales)
    .slice(0, 5);

  return {
    soldOutProductCount: soldOutProducts.length,
    soldOutOptionCount: soldOutOptions,
    topSoldOutProducts,
  };
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

function buildStoreFilter(
  storeId?: string,
  storeIds?: string[]
): { storeId?: string | { in: string[] } } {
  if (storeId) return { storeId };
  if (storeIds?.length) return { storeId: { in: storeIds } };
  return {};
}
