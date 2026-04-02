/**
 * Owner Customer Service — tenant-scoped customer management.
 *
 * "Customers" are identified by the Order.customerId string field.
 * This service derives customer data from Orders and Subscriptions,
 * and manages owner-only Customer profile records (for internalNote).
 *
 * Revenue metrics follow the same rules as owner reports:
 *   - Only COMPLETED orders are counted toward lifetime revenue.
 */
import { prisma } from "@/lib/prisma";
import { logAuditEvent } from "@/lib/audit";
import type {
  OwnerCustomerRow,
  OwnerCustomerListResult,
  OwnerCustomerKpi,
  OwnerCustomerDetail,
  OwnerCustomerOrderRow,
  OwnerCustomerSubscriptionRow,
} from "@/types/owner";

// Valid order statuses for revenue calculation (matches reports service)
const REVENUE_STATUSES = ["COMPLETED"] as const;

export interface GetOwnerCustomersParams {
  tenantId: string;
  q?: string;
  storeId?: string;
  subscriptionStatus?: "ACTIVE" | "PAUSED" | "CANCELLED" | "NONE";
  sort?: "recent_activity" | "lifetime_revenue" | "total_orders" | "newest_customer";
  page?: number;
  pageSize?: number;
}

export async function getOwnerCustomers(
  params: GetOwnerCustomersParams
): Promise<OwnerCustomerListResult> {
  const {
    tenantId,
    q,
    storeId,
    subscriptionStatus,
    sort = "recent_activity",
    page = 1,
    pageSize = 25,
  } = params;

  // Build base where clause for orders
  const orderWhere: Record<string, unknown> = {
    tenantId,
    customerId: { not: null },
  };
  if (storeId) orderWhere.storeId = storeId;

  // Fetch store names for this tenant
  const tenantStores = await prisma.store.findMany({
    where: { tenantId, ...(storeId ? { id: storeId } : {}) },
    select: { id: true, name: true },
  });
  const storeNameById = new Map(tenantStores.map((s) => [s.id, s.name]));

  // Fetch all relevant orders with customer info
  const allOrders = await prisma.order.findMany({
    where: orderWhere,
    select: {
      customerId: true,
      customerName: true,
      customerEmail: true,
      customerPhone: true,
      storeId: true,
      status: true,
      totalAmount: true,
      orderedAt: true,
      createdAt: true,
    },
    orderBy: { orderedAt: "desc" },
  });

  // Aggregate per customer
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const customerMap = new Map<string, {
    id: string;
    name: string | null;
    email: string | null;
    phone: string | null;
    storeOrderCounts: Map<string, { count: number; name: string }>;
    totalOrders: number;
    lifetimeRevenueMinorUnit: number;
    firstOrderAt: Date | null;
    lastOrderAt: Date | null;
    recent30dOrderCount: number;
  }>();

  for (const order of allOrders) {
    if (!order.customerId) continue;
    const cid = order.customerId;

    if (!customerMap.has(cid)) {
      customerMap.set(cid, {
        id: cid,
        name: order.customerName ?? null,
        email: order.customerEmail ?? null,
        phone: order.customerPhone ?? null,
        storeOrderCounts: new Map(),
        totalOrders: 0,
        lifetimeRevenueMinorUnit: 0,
        firstOrderAt: null,
        lastOrderAt: null,
        recent30dOrderCount: 0,
      });
    }

    const c = customerMap.get(cid)!;
    // Update profile info (use most recent non-null value)
    if (!c.name && order.customerName) c.name = order.customerName;
    if (!c.email && order.customerEmail) c.email = order.customerEmail;
    if (!c.phone && order.customerPhone) c.phone = order.customerPhone;

    c.totalOrders += 1;
    if (REVENUE_STATUSES.includes(order.status as typeof REVENUE_STATUSES[number])) {
      c.lifetimeRevenueMinorUnit += order.totalAmount;
    }

    const orderDate = order.orderedAt;
    if (!c.firstOrderAt || orderDate < c.firstOrderAt) c.firstOrderAt = orderDate;
    if (!c.lastOrderAt || orderDate > c.lastOrderAt) c.lastOrderAt = orderDate;
    if (orderDate >= thirtyDaysAgo) c.recent30dOrderCount += 1;

    const storeEntry = c.storeOrderCounts.get(order.storeId) ?? { count: 0, name: storeNameById.get(order.storeId) ?? order.storeId };
    storeEntry.count += 1;
    c.storeOrderCounts.set(order.storeId, storeEntry);
  }

  // Fetch active subscriptions per customer (for this tenant, via plan→store)
  const plansByTenant = await prisma.subscriptionPlan.findMany({
    where: {
      store: { tenantId },
      ...(storeId ? { storeId } : {}),
    },
    select: { id: true },
  });
  const tenantPlanIds = plansByTenant.map((p) => p.id);

  const subscriptions = tenantPlanIds.length > 0
    ? await prisma.subscription.findMany({
        where: { planId: { in: tenantPlanIds } },
        select: { customerId: true, status: true },
      })
    : [];

  const activeSubCount = new Map<string, number>();
  const pausedSubCount = new Map<string, number>();
  const cancelledSubCount = new Map<string, number>();
  const hasAnySubStatus = new Map<string, Set<string>>();

  for (const sub of subscriptions) {
    const cid = sub.customerId;
    const statuses = hasAnySubStatus.get(cid) ?? new Set<string>();
    statuses.add(sub.status);
    hasAnySubStatus.set(cid, statuses);

    if (sub.status === "ACTIVE") {
      activeSubCount.set(cid, (activeSubCount.get(cid) ?? 0) + 1);
    } else if (sub.status === "PAUSED") {
      pausedSubCount.set(cid, (pausedSubCount.get(cid) ?? 0) + 1);
    } else if (sub.status === "CANCELLED") {
      cancelledSubCount.set(cid, (cancelledSubCount.get(cid) ?? 0) + 1);
    }
  }

  // Convert to rows
  let rows: OwnerCustomerRow[] = [];
  for (const [cid, c] of customerMap.entries()) {
    // Apply search filter
    if (q) {
      const lq = q.toLowerCase();
      const nameMatch = c.name?.toLowerCase().includes(lq);
      const emailMatch = c.email?.toLowerCase().includes(lq);
      const phoneMatch = c.phone?.toLowerCase().includes(lq);
      if (!nameMatch && !emailMatch && !phoneMatch) continue;
    }

    // Apply subscription status filter
    if (subscriptionStatus) {
      if (subscriptionStatus === "NONE") {
        if (hasAnySubStatus.has(cid)) continue;
      } else {
        const statuses = hasAnySubStatus.get(cid);
        if (!statuses?.has(subscriptionStatus)) continue;
      }
    }

    // Determine primary store
    let primaryStoreName: string | null = null;
    let maxCount = 0;
    for (const [, store] of c.storeOrderCounts) {
      if (store.count > maxCount) {
        maxCount = store.count;
        primaryStoreName = store.name;
      }
    }

    rows.push({
      id: cid,
      name: c.name,
      email: c.email,
      phone: c.phone,
      primaryStoreName,
      totalOrders: c.totalOrders,
      lifetimeRevenueMinorUnit: c.lifetimeRevenueMinorUnit,
      activeSubscriptionCount: activeSubCount.get(cid) ?? 0,
      firstOrderAt: c.firstOrderAt?.toISOString() ?? null,
      lastOrderAt: c.lastOrderAt?.toISOString() ?? null,
      recent30dOrderCount: c.recent30dOrderCount,
      joinedAt: c.firstOrderAt?.toISOString() ?? null,
    });
  }

  // Sort
  if (sort === "recent_activity") {
    rows.sort((a, b) => (b.lastOrderAt ?? "").localeCompare(a.lastOrderAt ?? ""));
  } else if (sort === "lifetime_revenue") {
    rows.sort((a, b) => b.lifetimeRevenueMinorUnit - a.lifetimeRevenueMinorUnit);
  } else if (sort === "total_orders") {
    rows.sort((a, b) => b.totalOrders - a.totalOrders);
  } else if (sort === "newest_customer") {
    rows.sort((a, b) => (b.joinedAt ?? "").localeCompare(a.joinedAt ?? ""));
  }

  const total = rows.length;
  const offset = (page - 1) * pageSize;
  const paginated = rows.slice(offset, offset + pageSize);

  return { customers: paginated, total, page, pageSize };
}

export async function getOwnerCustomerKpi(tenantId: string): Promise<OwnerCustomerKpi> {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [allOrderCustomers, recent30dCustomers, plansByTenant] = await Promise.all([
    prisma.order.findMany({
      where: { tenantId, customerId: { not: null } },
      select: { customerId: true },
      distinct: ["customerId"],
    }),
    prisma.order.findMany({
      where: { tenantId, customerId: { not: null }, orderedAt: { gte: thirtyDaysAgo } },
      select: { customerId: true },
      distinct: ["customerId"],
    }),
    prisma.subscriptionPlan.findMany({
      where: { store: { tenantId } },
      select: { id: true },
    }),
  ]);

  const planIds = plansByTenant.map((p) => p.id);
  const [activeSubsCount, customersWithActiveSubs] = planIds.length > 0
    ? await Promise.all([
        prisma.subscription.count({ where: { planId: { in: planIds }, status: "ACTIVE" } }),
        prisma.subscription.findMany({
          where: { planId: { in: planIds }, status: "ACTIVE" },
          select: { customerId: true },
          distinct: ["customerId"],
        }),
      ])
    : [0, []];

  return {
    totalCustomers: allOrderCustomers.length,
    customersWithActiveSubscriptions: customersWithActiveSubs.length,
    customersOrderedLast30Days: recent30dCustomers.length,
    totalActiveSubscriptions: activeSubsCount,
  };
}

export async function getOwnerCustomerDetail(
  customerId: string,
  tenantId: string
): Promise<OwnerCustomerDetail | null> {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

  // Verify at least one order exists for this customer in this tenant
  const orders = await prisma.order.findMany({
    where: { tenantId, customerId },
    select: {
      id: true,
      storeId: true,
      status: true,
      sourceChannel: true,
      totalAmount: true,
      orderedAt: true,
      customerName: true,
      customerEmail: true,
      customerPhone: true,
    },
    orderBy: { orderedAt: "desc" },
  });

  // Fetch store names for stores referenced by this customer's orders
  const storeIds = [...new Set(orders.map((o) => o.storeId))];
  const storeRecords = storeIds.length > 0
    ? await prisma.store.findMany({
        where: { id: { in: storeIds }, tenantId },
        select: { id: true, name: true },
      })
    : [];
  const storeNameById = new Map(storeRecords.map((s) => [s.id, s.name]));

  // Also check subscriptions for this tenant
  const plansByTenant = await prisma.subscriptionPlan.findMany({
    where: { store: { tenantId } },
    select: { id: true },
  });
  const planIds = plansByTenant.map((p) => p.id);

  const subscriptions = planIds.length > 0
    ? await prisma.subscription.findMany({
        where: { planId: { in: planIds }, customerId },
        select: { status: true },
      })
    : [];

  if (orders.length === 0 && subscriptions.length === 0) return null;

  // Lookup stored Customer profile (for internalNote)
  const customerEmail = orders.length > 0 ? orders[0].customerEmail : null;
  const profile = customerEmail
    ? await prisma.customer.findFirst({ where: { tenantId, email: customerEmail } })
    : null;

  // Aggregate
  let name: string | null = null;
  let email: string | null = null;
  let phone: string | null = null;
  let firstOrderAt: Date | null = null;
  let lastOrderAt: Date | null = null;
  let totalOrders = 0;
  let lifetimeRevenueMinorUnit = 0;
  let recent30dOrderCount = 0;
  let recent90dRevenueMinorUnit = 0;
  const storeMap = new Map<string, { name: string; count: number; revenue: number }>();
  const channelMap = new Map<string, { count: number; revenue: number }>();

  for (const order of orders) {
    if (!name && order.customerName) name = order.customerName;
    if (!email && order.customerEmail) email = order.customerEmail;
    if (!phone && order.customerPhone) phone = order.customerPhone;

    totalOrders += 1;
    const isRevenue = REVENUE_STATUSES.includes(order.status as typeof REVENUE_STATUSES[number]);
    if (isRevenue) lifetimeRevenueMinorUnit += order.totalAmount;

    if (!firstOrderAt || order.orderedAt < firstOrderAt) firstOrderAt = order.orderedAt;
    if (!lastOrderAt || order.orderedAt > lastOrderAt) lastOrderAt = order.orderedAt;
    if (order.orderedAt >= thirtyDaysAgo) recent30dOrderCount += 1;
    if (order.orderedAt >= ninetyDaysAgo && isRevenue) recent90dRevenueMinorUnit += order.totalAmount;

    const storeEntry = storeMap.get(order.storeId) ?? { name: storeNameById.get(order.storeId) ?? order.storeId, count: 0, revenue: 0 };
    storeEntry.count += 1;
    if (isRevenue) storeEntry.revenue += order.totalAmount;
    storeMap.set(order.storeId, storeEntry);

    const ch = order.sourceChannel;
    const channelEntry = channelMap.get(ch) ?? { count: 0, revenue: 0 };
    channelEntry.count += 1;
    if (isRevenue) channelEntry.revenue += order.totalAmount;
    channelMap.set(ch, channelEntry);
  }

  const activeSubCount = subscriptions.filter((s) => s.status === "ACTIVE").length;
  const pausedSubCount = subscriptions.filter((s) => s.status === "PAUSED").length;
  const cancelledSubCount = subscriptions.filter((s) => s.status === "CANCELLED").length;

  return {
    id: customerId,
    name,
    email,
    phone,
    internalNote: profile?.internalNote ?? null,
    noteUpdatedAt: profile?.noteUpdatedAt?.toISOString() ?? null,
    totalOrders,
    lifetimeRevenueMinorUnit,
    activeSubscriptionCount: activeSubCount,
    pausedSubscriptionCount: pausedSubCount,
    cancelledSubscriptionCount: cancelledSubCount,
    firstOrderAt: firstOrderAt?.toISOString() ?? null,
    lastOrderAt: lastOrderAt?.toISOString() ?? null,
    recent30dOrderCount,
    recent90dRevenueMinorUnit,
    storeBreakdown: Array.from(storeMap.entries()).map(([storeId, v]) => ({
      storeId,
      storeName: v.name,
      orderCount: v.count,
      revenueMinorUnit: v.revenue,
    })),
    channelBreakdown: Array.from(channelMap.entries()).map(([channel, v]) => ({
      channel,
      orderCount: v.count,
      revenueMinorUnit: v.revenue,
    })),
  };
}

export async function getOwnerCustomerOrders(
  customerId: string,
  tenantId: string,
  params: { page?: number; pageSize?: number } = {}
): Promise<{ orders: OwnerCustomerOrderRow[]; total: number }> {
  const { page = 1, pageSize = 20 } = params;

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where: { tenantId, customerId },
      select: {
        id: true,
        storeId: true,
        sourceChannel: true,
        status: true,
        totalAmount: true,
        currencyCode: true,
        orderedAt: true,
        createdAt: true,
      },
      orderBy: { orderedAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.order.count({ where: { tenantId, customerId } }),
  ]);

  // Fetch store names for the returned orders
  const storeIds = [...new Set(orders.map((o) => o.storeId))];
  const storeRecords = storeIds.length > 0
    ? await prisma.store.findMany({
        where: { id: { in: storeIds }, tenantId },
        select: { id: true, name: true },
      })
    : [];
  const storeNameById = new Map(storeRecords.map((s) => [s.id, s.name]));

  return {
    orders: orders.map((o) => ({
      id: o.id,
      storeId: o.storeId,
      storeName: storeNameById.get(o.storeId) ?? o.storeId,
      sourceChannel: o.sourceChannel,
      status: o.status,
      totalAmountMinorUnit: o.totalAmount,
      currencyCode: o.currencyCode,
      orderedAt: o.orderedAt.toISOString(),
      createdAt: o.createdAt.toISOString(),
    })),
    total,
  };
}

export async function getOwnerCustomerSubscriptions(
  customerId: string,
  tenantId: string
): Promise<OwnerCustomerSubscriptionRow[]> {
  const plansByTenant = await prisma.subscriptionPlan.findMany({
    where: { store: { tenantId } },
    select: { id: true, name: true, interval: true, storeId: true, store: { select: { name: true } } },
  });
  const planIds = plansByTenant.map((p) => p.id);
  if (planIds.length === 0) return [];

  const planMap = new Map(plansByTenant.map((p) => [p.id, p]));

  const subscriptions = await prisma.subscription.findMany({
    where: { planId: { in: planIds }, customerId },
    orderBy: { createdAt: "desc" },
  });

  return subscriptions.map((sub) => {
    const plan = planMap.get(sub.planId);
    return {
      id: sub.id,
      planId: sub.planId,
      planName: plan?.name ?? "Unknown Plan",
      storeId: plan?.storeId ?? "",
      storeName: plan?.store.name ?? "Unknown Store",
      interval: plan?.interval ?? "unknown",
      status: sub.status,
      startDate: sub.startDate.toISOString(),
      nextBillingDate: sub.nextBillingDate.toISOString(),
      nextOrderAt: sub.nextOrderAt?.toISOString() ?? null,
      cancelledAt: sub.cancelledAt?.toISOString() ?? null,
      pausedAt: sub.pausedAt?.toISOString() ?? null,
      cancelReason: sub.cancelReason ?? null,
      internalNote: sub.internalNote ?? null,
      updatedAt: sub.updatedAt.toISOString(),
    };
  });
}

export async function updateOwnerCustomerNote(
  customerId: string,
  tenantId: string,
  note: string,
  actor: { userId: string }
): Promise<void> {
  // Verify customer exists in this tenant (has at least one order)
  const orderCount = await prisma.order.count({ where: { tenantId, customerId } });
  if (orderCount === 0) {
    // Check subscriptions as fallback
    const planIds = await prisma.subscriptionPlan.findMany({
      where: { store: { tenantId } },
      select: { id: true },
    }).then((plans) => plans.map((p) => p.id));
    if (planIds.length === 0) throw new Error("CUSTOMER_NOT_FOUND");
    const subCount = await prisma.subscription.count({ where: { planId: { in: planIds }, customerId } });
    if (subCount === 0) throw new Error("CUSTOMER_NOT_FOUND");
  }

  // Get or create customer profile
  const orderInfo = await prisma.order.findFirst({
    where: { tenantId, customerId },
    select: { customerEmail: true, customerName: true, customerPhone: true },
    orderBy: { createdAt: "desc" },
  });

  const existingProfile = orderInfo?.customerEmail
    ? await prisma.customer.findFirst({
        where: { tenantId, email: orderInfo.customerEmail },
      })
    : null;

  const oldNote = existingProfile?.internalNote ?? null;
  const now = new Date();

  if (existingProfile) {
    await prisma.customer.update({
      where: { id: existingProfile.id },
      data: {
        internalNote: note,
        noteUpdatedAt: now,
        noteUpdatedByUserId: actor.userId,
        name: existingProfile.name ?? orderInfo?.customerName ?? undefined,
        phone: existingProfile.phone ?? orderInfo?.customerPhone ?? undefined,
      },
    });
  } else {
    await prisma.customer.create({
      data: {
        tenantId,
        email: orderInfo?.customerEmail ?? null,
        name: orderInfo?.customerName ?? null,
        phone: orderInfo?.customerPhone ?? null,
        internalNote: note,
        noteUpdatedAt: now,
        noteUpdatedByUserId: actor.userId,
      },
    });
  }

  await logAuditEvent({
    tenantId,
    actorUserId: actor.userId,
    action: "OWNER_CUSTOMER_NOTE_UPDATED",
    targetType: "Customer",
    targetId: customerId,
    metadata: {
      customerId,
      before: oldNote,
      after: note,
    },
  });
}

export async function getOwnerCustomerNoteByCustomerId(
  customerId: string,
  tenantId: string
): Promise<{ internalNote: string | null; noteUpdatedAt: string | null }> {
  const orderInfo = await prisma.order.findFirst({
    where: { tenantId, customerId },
    select: { customerEmail: true },
    orderBy: { createdAt: "desc" },
  });

  if (!orderInfo?.customerEmail) return { internalNote: null, noteUpdatedAt: null };

  const profile = await prisma.customer.findFirst({
    where: { tenantId, email: orderInfo.customerEmail },
    select: { internalNote: true, noteUpdatedAt: true },
  });

  return {
    internalNote: profile?.internalNote ?? null,
    noteUpdatedAt: profile?.noteUpdatedAt?.toISOString() ?? null,
  };
}
