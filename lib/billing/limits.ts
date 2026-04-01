import { prisma } from "@/lib/prisma";
import type { PlanLimitItem } from "@/types/admin-billing";

/**
 * Get plan limits for a tenant's current active subscription.
 * Returns null if tenant has no active subscription.
 */
export async function getTenantPlanLimits(tenantId: string): Promise<PlanLimitItem[] | null> {
  const subscription = await prisma.tenantSubscription.findFirst({
    where: { tenantId, status: { in: ["ACTIVE", "TRIAL"] } },
    include: { plan: { include: { limits: true } } },
    orderBy: { createdAt: "desc" },
  });

  if (!subscription) return null;
  return subscription.plan.limits.map((l) => ({
    id: l.id,
    key: l.key,
    valueInt: l.valueInt,
    valueText: l.valueText,
    valueBool: l.valueBool,
    unit: l.unit,
  }));
}

/**
 * Assert that a tenant is within a specific plan limit.
 * Throws an error with a descriptive message if the limit would be exceeded.
 * Silently passes if no subscription or limit is found (no-enforcement fallback).
 */
export async function assertTenantWithinPlanLimit(
  tenantId: string,
  limitKey: string,
  nextValue: number
): Promise<void> {
  const limits = await getTenantPlanLimits(tenantId);
  if (!limits) return; // No subscription = no enforcement

  const limit = limits.find((l) => l.key === limitKey);
  if (!limit || limit.valueInt === null) return; // No limit defined = unlimited

  if (nextValue > limit.valueInt) {
    throw new Error(
      `plan_limit_exceeded: ${limitKey} limit is ${limit.valueInt}. Current value ${nextValue} would exceed it.`
    );
  }
}

/**
 * Check if a feature is enabled for a tenant's current plan.
 * Returns true if no subscription found (no-enforcement fallback).
 */
export async function isTenantFeatureEnabled(tenantId: string, featureKey: string): Promise<boolean> {
  const subscription = await prisma.tenantSubscription.findFirst({
    where: { tenantId, status: { in: ["ACTIVE", "TRIAL"] } },
    include: { plan: { include: { features: true } } },
    orderBy: { createdAt: "desc" },
  });

  if (!subscription) return true; // No subscription = no enforcement
  const feature = subscription.plan.features.find((f) => f.key === featureKey);
  return feature?.enabled ?? false;
}
