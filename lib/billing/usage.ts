import { prisma } from "@/lib/prisma";
import type { TenantUsageData, UsageLimitComparison, PlanLimitItem } from "@/types/admin-billing";

export async function calculateTenantCurrentUsage(tenantId: string, periodStart?: Date, periodEnd?: Date): Promise<TenantUsageData> {
  const now = new Date();
  const start = periodStart ?? new Date(now.getFullYear(), now.getMonth(), 1);
  const end = periodEnd ?? now;

  const [storesCount, usersCount, activeIntegrationsCount, ordersCount, subscriptionsCount] = await Promise.all([
    prisma.store.count({ where: { tenantId, status: { not: "ARCHIVED" } } }),
    prisma.membership.count({ where: { tenantId, status: "ACTIVE" } }),
    prisma.connection.count({ where: { tenantId, status: "CONNECTED" } }),
    prisma.order.count({
      where: {
        tenantId,
        createdAt: { gte: start, lte: end },
      },
    }).catch(() => 0),
    prisma.tenantSubscription.count({ where: { tenantId, status: { in: ["ACTIVE", "TRIAL"] } } }),
  ]);

  return {
    tenantId,
    storesCount,
    usersCount,
    activeIntegrationsCount,
    ordersCount,
    subscriptionsCount,
    capturedAt: now,
  };
}

export function compareUsageAgainstPlan(
  usage: TenantUsageData,
  limits: PlanLimitItem[]
): UsageLimitComparison[] {
  const limitMap = new Map(limits.map((l) => [l.key, l]));

  const comparisons: Array<{ key: string; label: string; current: number }> = [
    { key: "max_stores", label: "Stores", current: usage.storesCount },
    { key: "max_users", label: "Users", current: usage.usersCount },
    { key: "max_active_integrations", label: "Integrations", current: usage.activeIntegrationsCount },
    { key: "monthly_order_limit", label: "Monthly 주문", current: usage.ordersCount },
  ];

  return comparisons.map(({ key, label, current }) => {
    const limit = limitMap.get(key);
    const maxValue = limit?.valueInt ?? null;
    const unit = limit?.unit ?? null;

    if (maxValue === null || maxValue === 0) {
      return { key, label, current, limit: null, unit, status: "unlimited" as const, percentUsed: null };
    }

    const percentUsed = Math.round((current / maxValue) * 100);
    let status: "ok" | "warning" | "exceeded";
    if (current >= maxValue) {
      status = "exceeded";
    } else if (percentUsed >= 80) {
      status = "warning";
    } else {
      status = "ok";
    }

    return { key, label, current, limit: maxValue, unit, status, percentUsed };
  });
}

export function isOverLimit(comparisons: UsageLimitComparison[]): boolean {
  return comparisons.some((c) => c.status === "exceeded");
}
