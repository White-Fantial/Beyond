import { prisma } from "@/lib/prisma";
import type {
  AdminBillingOverview,
  PlanDistributionRow,
  RecentSubscriptionEventRow,
  RecentBillingRecordRow,
  SubscriptionEventType,
  BillingRecordType,
  BillingRecordStatus,
} from "@/types/admin-billing";

export async function getAdminBillingOverview(): Promise<AdminBillingOverview> {
  const [
    statusCounts,
    planDistribution,
    recentEvents,
    recentRecords,
    mrrSubscriptions,
  ] = await Promise.all([
    prisma.tenantSubscription.groupBy({
      by: ["status"],
      _count: { id: true },
    }),
    prisma.tenantSubscription.groupBy({
      by: ["planId"],
      where: { status: { in: ["ACTIVE", "TRIAL"] as never[] } },
      _count: { id: true },
    }),
    prisma.tenantSubscriptionEvent.findMany({
      select: {
        id: true,
        tenantId: true,
        eventType: true,
        note: true,
        createdAt: true,
        tenant: { select: { displayName: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    prisma.billingRecord.findMany({
      select: {
        id: true,
        tenantId: true,
        recordType: true,
        status: true,
        amountMinor: true,
        currencyCode: true,
        summary: true,
        createdAt: true,
        tenant: { select: { displayName: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    // Load ACTIVE subscription plan prices to compute MRR
    prisma.tenantSubscription.findMany({
      where: { status: "ACTIVE" as never },
      select: {
        plan: { select: { priceAmountMinor: true, billingInterval: true } },
      },
    }),
  ]);

  // Resolve plan details for distribution rows
  const planIds = planDistribution.map((p) => p.planId);
  const plans =
    planIds.length > 0
      ? await prisma.plan.findMany({
          where: { id: { in: planIds } },
          select: { id: true, code: true, name: true, priceAmountMinor: true, currencyCode: true },
        })
      : [];
  const planMap = new Map(plans.map((p) => [p.id, p]));

  const statusMap = new Map(statusCounts.map((s) => [s.status as string, s._count.id]));

  const mrrEstimateMinor = mrrSubscriptions.reduce((sum, s) => {
    if (s.plan.billingInterval === "MONTHLY") return sum + s.plan.priceAmountMinor;
    if (s.plan.billingInterval === "YEARLY") return sum + Math.round(s.plan.priceAmountMinor / 12);
    return sum;
  }, 0);

  const planDistributionRows: PlanDistributionRow[] = planDistribution.map((p) => {
    const plan = planMap.get(p.planId);
    return {
      planId: p.planId,
      planCode: plan?.code ?? "",
      planName: plan?.name ?? "",
      tenantCount: p._count.id,
      priceAmountMinor: plan?.priceAmountMinor ?? 0,
      currencyCode: plan?.currencyCode ?? "",
    };
  });

  const recentSubscriptionEvents: RecentSubscriptionEventRow[] = recentEvents.map((e) => ({
    id: e.id,
    tenantId: e.tenantId,
    tenantDisplayName: e.tenant.displayName,
    eventType: e.eventType as SubscriptionEventType,
    note: e.note,
    createdAt: e.createdAt,
  }));

  const recentBillingRecords: RecentBillingRecordRow[] = recentRecords.map((r) => ({
    id: r.id,
    tenantId: r.tenantId,
    tenantDisplayName: r.tenant.displayName,
    recordType: r.recordType as BillingRecordType,
    status: r.status as BillingRecordStatus,
    amountMinor: r.amountMinor,
    currencyCode: r.currencyCode,
    summary: r.summary,
    createdAt: r.createdAt,
  }));

  return {
    totalTenantsWithSubscription: statusCounts.reduce((sum, s) => sum + s._count.id, 0),
    activeSubscriptions: statusMap.get("ACTIVE") ?? 0,
    trialSubscriptions: statusMap.get("TRIAL") ?? 0,
    pastDueSubscriptions: statusMap.get("PAST_DUE") ?? 0,
    suspendedSubscriptions: statusMap.get("SUSPENDED") ?? 0,
    cancelledSubscriptions: statusMap.get("CANCELLED") ?? 0,
    planDistribution: planDistributionRows,
    recentSubscriptionEvents,
    recentBillingRecords,
    mrrEstimateMinor,
  };
}
