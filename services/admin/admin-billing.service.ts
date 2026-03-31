import { prisma } from "@/lib/prisma";
import type { AdminBillingSummary } from "@/types/admin";
import { mapSubscriptionPlanRow } from "@/lib/admin/mappers";

export async function getAdminBillingSummary(): Promise<AdminBillingSummary> {
  const [plans, totalSubscriptions, activeSubscriptions] = await Promise.all([
    prisma.subscriptionPlan.findMany({
      select: {
        id: true,
        storeId: true,
        name: true,
        price: true,
        interval: true,
        isActive: true,
        createdAt: true,
        store: {
          select: {
            name: true,
            tenant: { select: { displayName: true } },
          },
        },
        _count: { select: { subscriptions: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.subscription.count(),
    prisma.subscription.count({ where: { status: "ACTIVE" } }),
  ]);

  // Fetch active subscription counts per plan
  const activeCounts = await prisma.subscription.groupBy({
    by: ["planId"],
    where: { status: "ACTIVE" },
    _count: { id: true },
  });
  const activeCountMap = new Map<string, number>(
    activeCounts.map((r) => [r.planId, r._count.id])
  );

  return {
    totalSubscriptionPlans: plans.length,
    totalActiveSubscriptions: activeSubscriptions,
    totalSubscriptions,
    recentPlans: plans.map((p) =>
      mapSubscriptionPlanRow(p, activeCountMap.get(p.id) ?? 0)
    ),
  };
}
