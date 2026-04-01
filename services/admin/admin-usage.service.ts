import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import type {
  TenantUsageData,
  UsageLimitComparison,
  PaginatedResult,
} from "@/types/admin-billing";
import { buildPaginationMeta } from "@/lib/admin/filters";
import {
  calculateTenantCurrentUsage,
  compareUsageAgainstPlan,
} from "@/lib/billing/usage";

const USAGE_SNAPSHOT_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export async function getTenantUsageSnapshot(tenantId: string): Promise<TenantUsageData> {
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { id: true } });
  if (!tenant) notFound();

  const cutoff = new Date(Date.now() - USAGE_SNAPSHOT_TTL_MS);
  const cached = await prisma.usageSnapshot.findFirst({
    where: { tenantId, capturedAt: { gte: cutoff } },
    orderBy: { capturedAt: "desc" },
    select: {
      tenantId: true,
      storesCount: true,
      usersCount: true,
      activeIntegrationsCount: true,
      ordersCount: true,
      subscriptionsCount: true,
      capturedAt: true,
    },
  });

  if (cached) {
    return {
      tenantId: cached.tenantId,
      storesCount: cached.storesCount,
      usersCount: cached.usersCount,
      activeIntegrationsCount: cached.activeIntegrationsCount,
      ordersCount: cached.ordersCount,
      subscriptionsCount: cached.subscriptionsCount ?? 0,
      capturedAt: cached.capturedAt,
    };
  }

  return calculateTenantCurrentUsage(tenantId);
}

export async function captureUsageSnapshot(tenantId: string): Promise<void> {
  const [tenant, subscription] = await Promise.all([
    prisma.tenant.findUnique({ where: { id: tenantId }, select: { id: true } }),
    prisma.tenantSubscription.findFirst({
      where: { tenantId, status: { in: ["ACTIVE", "TRIAL"] as never[] } },
      select: { currentPeriodStart: true, currentPeriodEnd: true, trialStart: true, trialEnd: true, status: true },
      orderBy: { startedAt: "desc" },
    }),
  ]);

  if (!tenant) notFound();

  let periodStart: Date | undefined;
  let periodEnd: Date | undefined;

  if (subscription) {
    if (subscription.status === "TRIAL") {
      periodStart = subscription.trialStart ?? undefined;
      periodEnd = subscription.trialEnd ?? undefined;
    } else {
      periodStart = subscription.currentPeriodStart ?? undefined;
      periodEnd = subscription.currentPeriodEnd ?? undefined;
    }
  }

  const usage = await calculateTenantCurrentUsage(tenantId, periodStart, periodEnd);
  const now = new Date();

  await prisma.usageSnapshot.create({
    data: {
      tenantId,
      periodStart: periodStart ?? new Date(now.getFullYear(), now.getMonth(), 1),
      periodEnd: periodEnd ?? now,
      storesCount: usage.storesCount,
      usersCount: usage.usersCount,
      activeIntegrationsCount: usage.activeIntegrationsCount,
      ordersCount: usage.ordersCount,
      subscriptionsCount: usage.subscriptionsCount,
      capturedAt: now,
    },
  });
}

export async function compareUsageToPlanLimits(tenantId: string): Promise<UsageLimitComparison[]> {
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { id: true } });
  if (!tenant) notFound();

  const subscription = await prisma.tenantSubscription.findFirst({
    where: { tenantId, status: { in: ["ACTIVE", "TRIAL"] as never[] } },
    select: {
      currentPeriodStart: true,
      currentPeriodEnd: true,
      plan: {
        select: {
          limits: {
            select: { id: true, key: true, valueInt: true, valueText: true, valueBool: true, unit: true },
          },
        },
      },
    },
    orderBy: { startedAt: "desc" },
  });

  const usage = await calculateTenantCurrentUsage(
    tenantId,
    subscription?.currentPeriodStart ?? undefined,
    subscription?.currentPeriodEnd ?? undefined
  );

  return compareUsageAgainstPlan(usage, subscription?.plan.limits ?? []);
}

export async function listUsageWarnings(params: {
  page?: number;
  pageSize?: number;
}): Promise<
  PaginatedResult<{
    tenantId: string;
    tenantDisplayName: string;
    warnings: UsageLimitComparison[];
  }>
> {
  const page = Math.max(1, Number(params.page ?? 1) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(params.pageSize ?? 20) || 20));

  // Load all active/trial subscriptions with plan limits
  const subscriptions = await prisma.tenantSubscription.findMany({
    where: { status: { in: ["ACTIVE", "TRIAL"] as never[] } },
    select: {
      tenantId: true,
      tenant: { select: { displayName: true } },
      plan: {
        select: {
          limits: {
            select: { id: true, key: true, valueInt: true, valueText: true, valueBool: true, unit: true },
          },
        },
      },
    },
    orderBy: { startedAt: "desc" },
  });

  // Deduplicate to one subscription per tenant (latest active/trial)
  const tenantSubMap = new Map<
    string,
    { tenantId: string; tenantDisplayName: string; limits: typeof subscriptions[0]["plan"]["limits"] }
  >();
  for (const sub of subscriptions) {
    if (!tenantSubMap.has(sub.tenantId)) {
      tenantSubMap.set(sub.tenantId, {
        tenantId: sub.tenantId,
        tenantDisplayName: sub.tenant.displayName,
        limits: sub.plan.limits,
      });
    }
  }

  const uniqueSubs = Array.from(tenantSubMap.values());
  const tenantIds = uniqueSubs.map((s) => s.tenantId);

  // Batch-load usage counts for all tenants
  const [storeCounts, memberCounts, integrationCounts] = await Promise.all([
    prisma.store.groupBy({
      by: ["tenantId"],
      where: { tenantId: { in: tenantIds }, status: { not: "ARCHIVED" as never } },
      _count: { id: true },
    }),
    prisma.membership.groupBy({
      by: ["tenantId"],
      where: { tenantId: { in: tenantIds }, status: "ACTIVE" as never },
      _count: { id: true },
    }),
    prisma.connection.groupBy({
      by: ["tenantId"],
      where: { tenantId: { in: tenantIds }, status: "CONNECTED" as never },
      _count: { id: true },
    }),
  ]);

  const storeCountMap = new Map(storeCounts.map((r) => [r.tenantId, r._count.id]));
  const memberCountMap = new Map(memberCounts.map((r) => [r.tenantId, r._count.id]));
  const integrationCountMap = new Map(integrationCounts.map((r) => [r.tenantId, r._count.id]));

  // Compute warnings for each tenant, filter to those with issues
  const warningRows = uniqueSubs
    .map((sub) => {
      const usage: TenantUsageData = {
        tenantId: sub.tenantId,
        storesCount: storeCountMap.get(sub.tenantId) ?? 0,
        usersCount: memberCountMap.get(sub.tenantId) ?? 0,
        activeIntegrationsCount: integrationCountMap.get(sub.tenantId) ?? 0,
        ordersCount: 0,
        subscriptionsCount: 1,
        capturedAt: new Date(),
      };

      const comparisons = compareUsageAgainstPlan(usage, sub.limits);
      const warnings = comparisons.filter(
        (c) => c.status === "warning" || c.status === "exceeded"
      );

      return warnings.length > 0
        ? { tenantId: sub.tenantId, tenantDisplayName: sub.tenantDisplayName, warnings }
        : null;
    })
    .filter((row): row is NonNullable<typeof row> => row !== null);

  const total = warningRows.length;
  const items = warningRows.slice((page - 1) * pageSize, (page - 1) * pageSize + pageSize);

  return { items, pagination: buildPaginationMeta(total, page, pageSize) };
}
