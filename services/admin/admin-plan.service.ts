import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import type {
  AdminPlanListParams,
  AdminPlanListItem,
  AdminPlanDetail,
  PlanTenantRow,
  CreatePlanInput,
  UpdatePlanInput,
  PlanLimitInput,
  PlanFeatureInput,
  PlanStatus,
  BillingInterval,
  SubscriptionStatus,
  PaginatedResult,
} from "@/types/admin-billing";
import { buildPaginationMeta } from "@/lib/admin/filters";
import { validatePlanCode } from "@/lib/billing/validation";
import {
  auditAdminPlanCreated,
  auditAdminPlanUpdated,
  auditAdminPlanStatusChanged,
} from "@/lib/audit";

export async function listAdminPlans(
  params: AdminPlanListParams
): Promise<PaginatedResult<AdminPlanListItem>> {
  const page = Math.max(1, Number(params.page ?? 1) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(params.pageSize ?? 20) || 20));
  const skip = (page - 1) * pageSize;

  const where = {
    ...(params.status ? { status: params.status as never } : {}),
  };

  const [plans, total] = await Promise.all([
    prisma.plan.findMany({
      where,
      select: {
        id: true,
        code: true,
        name: true,
        description: true,
        status: true,
        billingInterval: true,
        priceAmountMinor: true,
        currencyCode: true,
        trialDays: true,
        isDefault: true,
        sortOrder: true,
        updatedAt: true,
        _count: { select: { subscriptions: true } },
      },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      skip,
      take: pageSize,
    }),
    prisma.plan.count({ where }),
  ]);

  return {
    items: plans.map((p) => ({
      id: p.id,
      code: p.code,
      name: p.name,
      description: p.description,
      status: p.status as PlanStatus,
      billingInterval: p.billingInterval as BillingInterval,
      priceAmountMinor: p.priceAmountMinor,
      currencyCode: p.currencyCode,
      trialDays: p.trialDays,
      isDefault: p.isDefault,
      sortOrder: p.sortOrder,
      tenantCount: p._count.subscriptions,
      updatedAt: p.updatedAt,
    })),
    pagination: buildPaginationMeta(total, page, pageSize),
  };
}

export async function getAdminPlanDetail(planId: string): Promise<AdminPlanDetail> {
  const plan = await prisma.plan.findUnique({
    where: { id: planId },
    select: {
      id: true,
      code: true,
      name: true,
      description: true,
      status: true,
      billingInterval: true,
      priceAmountMinor: true,
      currencyCode: true,
      trialDays: true,
      isDefault: true,
      sortOrder: true,
      metadataJson: true,
      createdAt: true,
      updatedAt: true,
      limits: {
        select: { id: true, key: true, valueInt: true, valueText: true, valueBool: true, unit: true },
      },
      features: {
        select: { id: true, key: true, enabled: true, configJson: true },
      },
    },
  });

  if (!plan) notFound();

  const [tenantCount, recentSubscriptions] = await Promise.all([
    prisma.tenantSubscription.count({
      where: { planId, status: { in: ["ACTIVE", "TRIAL"] as never[] } },
    }),
    prisma.tenantSubscription.findMany({
      where: { planId },
      select: {
        id: true,
        status: true,
        currentPeriodEnd: true,
        tenant: { select: { id: true, displayName: true, slug: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);

  const tenantIds = recentSubscriptions.map((s) => s.tenant.id);

  const [storeCounts, memberCounts] = await Promise.all([
    prisma.store.groupBy({
      by: ["tenantId"],
      where: { tenantId: { in: tenantIds } },
      _count: { id: true },
    }),
    prisma.membership.groupBy({
      by: ["tenantId"],
      where: { tenantId: { in: tenantIds } },
      _count: { id: true },
    }),
  ]);

  const storeCountMap = new Map(storeCounts.map((r) => [r.tenantId, r._count.id]));
  const memberCountMap = new Map(memberCounts.map((r) => [r.tenantId, r._count.id]));

  const tenants: PlanTenantRow[] = recentSubscriptions.map((s) => ({
    tenantId: s.tenant.id,
    tenantDisplayName: s.tenant.displayName,
    tenantSlug: s.tenant.slug,
    subscriptionId: s.id,
    subscriptionStatus: s.status as SubscriptionStatus,
    currentPeriodEnd: s.currentPeriodEnd,
    storesCount: storeCountMap.get(s.tenant.id) ?? 0,
    usersCount: memberCountMap.get(s.tenant.id) ?? 0,
  }));

  return {
    id: plan.id,
    code: plan.code,
    name: plan.name,
    description: plan.description,
    status: plan.status as PlanStatus,
    billingInterval: plan.billingInterval as BillingInterval,
    priceAmountMinor: plan.priceAmountMinor,
    currencyCode: plan.currencyCode,
    trialDays: plan.trialDays,
    isDefault: plan.isDefault,
    sortOrder: plan.sortOrder,
    metadataJson: plan.metadataJson as Record<string, unknown> | null,
    limits: plan.limits.map((l) => ({
      id: l.id,
      key: l.key,
      valueInt: l.valueInt,
      valueText: l.valueText,
      valueBool: l.valueBool,
      unit: l.unit,
    })),
    features: plan.features.map((f) => ({
      id: f.id,
      key: f.key,
      enabled: f.enabled,
      configJson: f.configJson as Record<string, unknown> | null,
    })),
    tenantCount,
    tenants,
    createdAt: plan.createdAt,
    updatedAt: plan.updatedAt,
  };
}

export async function createAdminPlan(
  input: CreatePlanInput,
  actorUserId: string
): Promise<{ id: string }> {
  const codeError = validatePlanCode(input.code);
  if (codeError) throw new Error(codeError);

  const existing = await prisma.plan.findUnique({ where: { code: input.code }, select: { id: true } });
  if (existing) throw new Error(`이미 사용 중인 플랜 코드입니다: ${input.code}`);

  if (input.isDefault) {
    await prisma.plan.updateMany({ where: { isDefault: true }, data: { isDefault: false } });
  }

  const plan = await prisma.plan.create({
    data: {
      code: input.code,
      name: input.name,
      description: input.description,
      billingInterval: input.billingInterval as never,
      priceAmountMinor: input.priceAmountMinor,
      currencyCode: input.currencyCode ?? "NZD",
      trialDays: input.trialDays ?? null,
      isDefault: input.isDefault ?? false,
      sortOrder: input.sortOrder ?? 0,
    },
    select: { id: true },
  });

  await auditAdminPlanCreated(plan.id, actorUserId, { code: input.code, name: input.name });
  return { id: plan.id };
}

export async function updateAdminPlan(
  planId: string,
  input: UpdatePlanInput,
  actorUserId: string
): Promise<void> {
  const plan = await prisma.plan.findUnique({ where: { id: planId }, select: { id: true } });
  if (!plan) notFound();

  if (input.isDefault) {
    await prisma.plan.updateMany({
      where: { isDefault: true, id: { not: planId } },
      data: { isDefault: false },
    });
  }

  const data: Record<string, unknown> = {};
  if (input.name !== undefined) data.name = input.name;
  if (input.description !== undefined) data.description = input.description;
  if (input.billingInterval !== undefined) data.billingInterval = input.billingInterval;
  if (input.priceAmountMinor !== undefined) data.priceAmountMinor = input.priceAmountMinor;
  if (input.currencyCode !== undefined) data.currencyCode = input.currencyCode;
  if (input.trialDays !== undefined) data.trialDays = input.trialDays;
  if (input.isDefault !== undefined) data.isDefault = input.isDefault;
  if (input.sortOrder !== undefined) data.sortOrder = input.sortOrder;

  if (Object.keys(data).length === 0) return;

  await prisma.plan.update({ where: { id: planId }, data });
  await auditAdminPlanUpdated(planId, actorUserId, { updated: Object.keys(data) });
}

export async function updateAdminPlanStatus(
  planId: string,
  status: PlanStatus,
  actorUserId: string
): Promise<void> {
  const plan = await prisma.plan.findUnique({ where: { id: planId }, select: { id: true, status: true } });
  if (!plan) notFound();

  await prisma.plan.update({ where: { id: planId }, data: { status: status as never } });
  await auditAdminPlanStatusChanged(planId, actorUserId, { before: plan.status, after: status });
}

export async function replaceAdminPlanLimits(
  planId: string,
  limits: PlanLimitInput[],
  actorUserId: string
): Promise<void> {
  const plan = await prisma.plan.findUnique({ where: { id: planId }, select: { id: true } });
  if (!plan) notFound();

  await prisma.$transaction([
    prisma.planLimit.deleteMany({ where: { planId } }),
    prisma.planLimit.createMany({
      data: limits.map((l) => ({
        planId,
        key: l.key,
        valueInt: l.valueInt ?? null,
        valueText: l.valueText ?? null,
        valueBool: l.valueBool ?? null,
        unit: l.unit ?? null,
      })),
    }),
  ]);

  await auditAdminPlanUpdated(planId, actorUserId, { action: "limits_updated" });
}

export async function replaceAdminPlanFeatures(
  planId: string,
  features: PlanFeatureInput[],
  actorUserId: string
): Promise<void> {
  const plan = await prisma.plan.findUnique({ where: { id: planId }, select: { id: true } });
  if (!plan) notFound();

  await prisma.$transaction([
    prisma.planFeature.deleteMany({ where: { planId } }),
    prisma.planFeature.createMany({
      data: features.map((f) => ({
        planId,
        key: f.key,
        enabled: f.enabled,
        ...(f.configJson != null ? { configJson: f.configJson as never } : {}),
      })),
    }),
  ]);

  await auditAdminPlanUpdated(planId, actorUserId, { action: "features_updated" });
}
