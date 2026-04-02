/**
 * Owner Subscriptions Service — subscription overview for owner portal.
 *
 * Note: The current Subscription schema (planId, customerId, status,
 * startDate, nextBillingDate) is minimal. Some features are stubbed with
 * typed TODOs pending schema expansion.
 */
import { prisma } from "@/lib/prisma";
import type {
  OwnerSubscriptionSummary,
  OwnerSubscriptionCustomerRow,
  OwnerUpcomingSubscriptionRow,
} from "@/types/owner";

export async function getOwnerSubscriptionSummary(
  storeId: string
): Promise<OwnerSubscriptionSummary> {
  const plans = await prisma.subscriptionPlan.findMany({
    where: { storeId, isActive: true },
    select: { id: true, price: true },
  });

  const planIds = plans.map((p) => p.id);

  const [activeCount, pausedCount, next7DaysCount] = await Promise.all([
    prisma.subscription.count({ where: { planId: { in: planIds }, status: "ACTIVE" } }),
    prisma.subscription.count({ where: { planId: { in: planIds }, status: "PAUSED" } }),
    prisma.subscription.count({
      where: {
        planId: { in: planIds },
        status: "ACTIVE",
        nextBillingDate: { lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
      },
    }),
  ]);

  // TODO: Expand when subscription line items / product links are added to schema
  const subscriptionEnabledProductCount = await prisma.catalogProduct.count({
    where: { storeId, isVisibleOnSubscription: true, deletedAt: null },
  });

  return {
    activeCount,
    pausedCount,
    next7DaysExpectedOrderCount: next7DaysCount,
    next30DaysExpectedRevenueMajorUnit: 0, // TODO: sum plan prices × active subscriptions
    subscriptionEnabledProductCount,
  };
}

export async function listOwnerSubscriptionCustomers(
  storeId: string
): Promise<OwnerSubscriptionCustomerRow[]> {
  const plans = await prisma.subscriptionPlan.findMany({
    where: { storeId },
    select: { id: true, price: true },
  });

  const planIds = plans.map((p) => p.id);

  // TODO: Subscription.customerId currently links to a string — full customer
  // profile lookup requires a Customer/User join that depends on future schema.
  const subscriptions = await prisma.subscription.findMany({
    where: { planId: { in: planIds }, status: { in: ["ACTIVE", "PAUSED"] } },
    include: { plan: { select: { price: true } } },
    orderBy: { nextBillingDate: "asc" },
  });

  // Group by customerId
  const byCustomer = new Map<string, typeof subscriptions>();
  for (const sub of subscriptions) {
    const existing = byCustomer.get(sub.customerId) ?? [];
    existing.push(sub);
    byCustomer.set(sub.customerId, existing);
  }

  const rows: OwnerSubscriptionCustomerRow[] = [];
  for (const [customerId, subs] of byCustomer.entries()) {
    const activeSubs = subs.filter((s) => s.status === "ACTIVE");
    const pausedSubs = subs.filter((s) => s.status === "PAUSED");
    const nextOrder = activeSubs
      .map((s) => s.nextBillingDate)
      .sort((a, b) => a.getTime() - b.getTime())[0];

    rows.push({
      customerId,
      name: null, // TODO: join with Customer/User table when available
      email: null, // TODO: join with Customer/User table when available
      activeSubscriptionCount: activeSubs.length,
      pausedSubscriptionCount: pausedSubs.length,
      nextOrderDate: nextOrder?.toISOString() ?? null,
      totalMonthlyAmountMinorUnit: activeSubs.reduce((sum, s) => sum + s.plan.price, 0),
    });
  }

  return rows;
}

export async function listOwnerUpcomingSubscriptions(
  storeId: string,
  days = 30
): Promise<OwnerUpcomingSubscriptionRow[]> {
  const plans = await prisma.subscriptionPlan.findMany({
    where: { storeId },
    select: { id: true, name: true, price: true },
  });

  const planIds = plans.map((p) => p.id);
  const planMap = new Map(plans.map((p) => [p.id, p]));

  const upcoming = await prisma.subscription.findMany({
    where: {
      planId: { in: planIds },
      status: "ACTIVE",
      nextBillingDate: {
        lte: new Date(Date.now() + days * 24 * 60 * 60 * 1000),
      },
    },
    orderBy: { nextBillingDate: "asc" },
    take: 100,
  });

  return upcoming.map((sub) => {
    const plan = planMap.get(sub.planId);
    return {
      subscriptionId: sub.id,
      customerId: sub.customerId,
      customerName: null, // TODO: join with Customer table
      nextBillingDate: sub.nextBillingDate.toISOString(),
      planName: plan?.name ?? "Unknown Plan",
      expectedAmountMinorUnit: plan?.price ?? 0,
      status: "SCHEDULED",
    };
  });
}
