import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import type {
  AdminTenantBillingListParams,
  AdminTenantBillingListItem,
  AdminTenantBillingDetail,
  TenantBillingAccountData,
  BillingRecordRow,
  SubscriptionEventRow,
  SubscriptionStatus,
  SubscriptionEventType,
  BillingRecordType,
  BillingRecordStatus,
  BillingInterval,
  AssignTenantPlanInput,
  ChangeTenantPlanInput,
  ExtendTenantTrialInput,
  UpdateTenantSubscriptionStatusInput,
  UpdateTenantBillingAccountInput,
  AddBillingRecordInput,
  PaginatedResult,
} from "@/types/admin-billing";
import { buildPaginationMeta } from "@/lib/admin/filters";
import { calculateTenantCurrentUsage, compareUsageAgainstPlan, isOverLimit } from "@/lib/billing/usage";
import {
  auditAdminTenantPlanAssigned,
  auditAdminTenantPlanChanged,
  auditAdminTenantTrialExtended,
  auditAdminTenantSubscriptionStatusChanged,
  auditAdminTenantBillingAccountUpdated,
  auditAdminTenantBillingRecordAdded,
} from "@/lib/audit";

// ─── List ──────────────────────────────────────────────────────────────────────

export async function listAdminTenantBillings(
  params: AdminTenantBillingListParams
): Promise<PaginatedResult<AdminTenantBillingListItem>> {
  const page = Math.max(1, Number(params.page ?? 1) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(params.pageSize ?? 20) || 20));
  const skip = (page - 1) * pageSize;
  const q = (params.q ?? "").trim();

  const effectiveStatus = params.trialOnly
    ? "TRIAL"
    : params.pastDueOnly
    ? "PAST_DUE"
    : params.status || undefined;

  const where = {
    ...(effectiveStatus ? { status: effectiveStatus as never } : {}),
    ...(params.planId ? { planId: params.planId } : {}),
    ...(q
      ? {
          tenant: {
            OR: [
              { displayName: { contains: q, mode: "insensitive" as const } },
              { slug: { contains: q, mode: "insensitive" as const } },
            ],
          },
        }
      : {}),
  };

  if (params.overLimitOnly) {
    return await listBillingsWithOverLimitFilter(where, page, pageSize);
  }

  const [subscriptions, total] = await Promise.all([
    prisma.tenantSubscription.findMany({
      where,
      select: {
        id: true,
        status: true,
        trialEnd: true,
        currentPeriodEnd: true,
        updatedAt: true,
        tenant: {
          select: {
            id: true,
            displayName: true,
            slug: true,
            billingAccount: { select: { billingEmail: true } },
          },
        },
        plan: {
          select: {
            id: true,
            code: true,
            name: true,
            limits: { select: { key: true, valueInt: true } },
          },
        },
      },
      orderBy: { updatedAt: "desc" },
      skip,
      take: pageSize,
    }),
    prisma.tenantSubscription.count({ where }),
  ]);

  const tenantIds = subscriptions.map((s) => s.tenant.id);
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

  const items: AdminTenantBillingListItem[] = subscriptions.map((s) => {
    const storesCount = storeCountMap.get(s.tenant.id) ?? 0;
    const usersCount = memberCountMap.get(s.tenant.id) ?? 0;
    const activeIntegrationsCount = integrationCountMap.get(s.tenant.id) ?? 0;

    const over = isOverLimit(
      compareUsageAgainstPlan(
        {
          tenantId: s.tenant.id,
          storesCount,
          usersCount,
          activeIntegrationsCount,
          ordersCount: 0,
          subscriptionsCount: 1,
          capturedAt: new Date(),
        },
        s.plan.limits.map((l) => ({
          id: "",
          key: l.key,
          valueInt: l.valueInt,
          valueText: null,
          valueBool: null,
          unit: null,
        }))
      )
    );

    return {
      tenantId: s.tenant.id,
      tenantDisplayName: s.tenant.displayName,
      tenantSlug: s.tenant.slug,
      planCode: s.plan.code,
      planName: s.plan.name,
      subscriptionId: s.id,
      subscriptionStatus: s.status as SubscriptionStatus,
      trialEnd: s.trialEnd,
      currentPeriodEnd: s.currentPeriodEnd,
      billingEmail: s.tenant.billingAccount?.billingEmail ?? null,
      storesCount,
      usersCount,
      activeIntegrationsCount,
      isOverLimit: over,
      updatedAt: s.updatedAt,
    };
  });

  return { items, pagination: buildPaginationMeta(total, page, pageSize) };
}

async function listBillingsWithOverLimitFilter(
  where: Record<string, unknown>,
  page: number,
  pageSize: number
): Promise<PaginatedResult<AdminTenantBillingListItem>> {
  const subscriptions = await prisma.tenantSubscription.findMany({
    where,
    select: {
      id: true,
      status: true,
      trialEnd: true,
      currentPeriodEnd: true,
      updatedAt: true,
      tenant: {
        select: {
          id: true,
          displayName: true,
          slug: true,
          billingAccount: { select: { billingEmail: true } },
        },
      },
      plan: {
        select: {
          code: true,
          name: true,
          limits: { select: { key: true, valueInt: true } },
        },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  const tenantIds = subscriptions.map((s) => s.tenant.id);
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

  const allItems: AdminTenantBillingListItem[] = subscriptions
    .map((s) => {
      const storesCount = storeCountMap.get(s.tenant.id) ?? 0;
      const usersCount = memberCountMap.get(s.tenant.id) ?? 0;
      const activeIntegrationsCount = integrationCountMap.get(s.tenant.id) ?? 0;
      const comparisons = compareUsageAgainstPlan(
        {
          tenantId: s.tenant.id,
          storesCount,
          usersCount,
          activeIntegrationsCount,
          ordersCount: 0,
          subscriptionsCount: 1,
          capturedAt: new Date(),
        },
        s.plan.limits.map((l) => ({
          id: "",
          key: l.key,
          valueInt: l.valueInt,
          valueText: null,
          valueBool: null,
          unit: null,
        }))
      );

      return {
        tenantId: s.tenant.id,
        tenantDisplayName: s.tenant.displayName,
        tenantSlug: s.tenant.slug,
        planCode: s.plan.code,
        planName: s.plan.name,
        subscriptionId: s.id,
        subscriptionStatus: s.status as SubscriptionStatus,
        trialEnd: s.trialEnd,
        currentPeriodEnd: s.currentPeriodEnd,
        billingEmail: s.tenant.billingAccount?.billingEmail ?? null,
        storesCount,
        usersCount,
        activeIntegrationsCount,
        isOverLimit: isOverLimit(comparisons),
        updatedAt: s.updatedAt,
      };
    })
    .filter((item) => item.isOverLimit);

  const total = allItems.length;
  const items = allItems.slice((page - 1) * pageSize, (page - 1) * pageSize + pageSize);
  return { items, pagination: buildPaginationMeta(total, page, pageSize) };
}

// ─── Detail ────────────────────────────────────────────────────────────────────

export async function getAdminTenantBillingDetail(
  tenantId: string
): Promise<AdminTenantBillingDetail> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: {
      id: true,
      displayName: true,
      slug: true,
      status: true,
      billingAccount: true,
      subscriptions: {
        select: {
          id: true,
          planId: true,
          status: true,
          billingInterval: true,
          currentPeriodStart: true,
          currentPeriodEnd: true,
          trialStart: true,
          trialEnd: true,
          cancelAtPeriodEnd: true,
          cancelledAt: true,
          suspendedAt: true,
          reactivatedAt: true,
          startedAt: true,
          externalSubscriptionRef: true,
          plan: {
            select: {
              code: true,
              name: true,
              limits: {
                select: { id: true, key: true, valueInt: true, valueText: true, valueBool: true, unit: true },
              },
              features: {
                select: { id: true, key: true, enabled: true, configJson: true },
              },
            },
          },
        },
        orderBy: { startedAt: "desc" },
        take: 1,
      },
    },
  });

  if (!tenant) notFound();

  const subscription = tenant.subscriptions[0] ?? null;

  const [billingRecords, events, usage] = await Promise.all([
    prisma.billingRecord.findMany({
      where: { tenantId },
      select: {
        id: true,
        recordType: true,
        status: true,
        amountMinor: true,
        currencyCode: true,
        dueAt: true,
        paidAt: true,
        summary: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.tenantSubscriptionEvent.findMany({
      where: { tenantId },
      select: {
        id: true,
        eventType: true,
        actorLabel: true,
        fromStatus: true,
        toStatus: true,
        fromPlanId: true,
        toPlanId: true,
        note: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    calculateTenantCurrentUsage(
      tenantId,
      subscription?.currentPeriodStart ?? undefined,
      subscription?.currentPeriodEnd ?? undefined
    ),
  ]);

  // Batch-load plan codes referenced in events
  const planIds = [
    ...new Set(
      events
        .flatMap((e) => [e.fromPlanId, e.toPlanId])
        .filter((id): id is string => id != null)
    ),
  ];
  const eventPlans =
    planIds.length > 0
      ? await prisma.plan.findMany({
          where: { id: { in: planIds } },
          select: { id: true, code: true },
        })
      : [];
  const planCodeMap = new Map(eventPlans.map((p) => [p.id, p.code]));

  const planLimits = subscription?.plan.limits ?? [];
  const usageComparisons = compareUsageAgainstPlan(usage, planLimits);

  const billingAccountRaw = tenant.billingAccount;
  const billingAccount: TenantBillingAccountData | null = billingAccountRaw
    ? {
        id: billingAccountRaw.id,
        tenantId: billingAccountRaw.tenantId,
        billingEmail: billingAccountRaw.billingEmail,
        companyName: billingAccountRaw.companyName,
        legalName: billingAccountRaw.legalName,
        taxNumber: billingAccountRaw.taxNumber,
        addressLine1: billingAccountRaw.addressLine1,
        addressLine2: billingAccountRaw.addressLine2,
        city: billingAccountRaw.city,
        region: billingAccountRaw.region,
        postalCode: billingAccountRaw.postalCode,
        countryCode: billingAccountRaw.countryCode,
        externalCustomerRef: billingAccountRaw.externalCustomerRef,
        notes: billingAccountRaw.notes,
        createdAt: billingAccountRaw.createdAt,
        updatedAt: billingAccountRaw.updatedAt,
      }
    : null;

  const billingRecordsMapped: BillingRecordRow[] = billingRecords.map((r) => ({
    id: r.id,
    recordType: r.recordType as BillingRecordType,
    status: r.status as BillingRecordStatus,
    amountMinor: r.amountMinor,
    currencyCode: r.currencyCode,
    dueAt: r.dueAt,
    paidAt: r.paidAt,
    summary: r.summary,
    createdAt: r.createdAt,
  }));

  const subscriptionEvents: SubscriptionEventRow[] = events.map((e) => ({
    id: e.id,
    eventType: e.eventType as SubscriptionEventType,
    actorLabel: e.actorLabel,
    fromStatus: e.fromStatus,
    toStatus: e.toStatus,
    fromPlanCode: e.fromPlanId ? (planCodeMap.get(e.fromPlanId) ?? null) : null,
    toPlanCode: e.toPlanId ? (planCodeMap.get(e.toPlanId) ?? null) : null,
    note: e.note,
    createdAt: e.createdAt,
  }));

  return {
    tenantId: tenant.id,
    tenantDisplayName: tenant.displayName,
    tenantSlug: tenant.slug,
    tenantStatus: tenant.status as string,
    subscription: subscription
      ? {
          id: subscription.id,
          planId: subscription.planId,
          planCode: subscription.plan.code,
          planName: subscription.plan.name,
          status: subscription.status as SubscriptionStatus,
          billingInterval: subscription.billingInterval as BillingInterval,
          currentPeriodStart: subscription.currentPeriodStart,
          currentPeriodEnd: subscription.currentPeriodEnd,
          trialStart: subscription.trialStart,
          trialEnd: subscription.trialEnd,
          cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
          cancelledAt: subscription.cancelledAt,
          suspendedAt: subscription.suspendedAt,
          reactivatedAt: subscription.reactivatedAt,
          startedAt: subscription.startedAt,
          externalSubscriptionRef: subscription.externalSubscriptionRef,
        }
      : null,
    billingAccount,
    usage,
    usageComparisons,
    billingRecords: billingRecordsMapped,
    subscriptionEvents,
  };
}

// ─── Write operations ──────────────────────────────────────────────────────────

export async function assignTenantPlan(
  input: AssignTenantPlanInput
): Promise<{ subscriptionId: string }> {
  const { tenantId, planId, billingInterval, trialDays, note, actorUserId } = input;

  const existing = await prisma.tenantSubscription.findFirst({
    where: { tenantId, status: { in: ["ACTIVE", "TRIAL"] as never[] } },
    select: { id: true, status: true },
  });
  if (existing) {
    throw new Error("Tenant에 이미 Active 또는 Trial 구독이 있습니다.");
  }

  const plan = await prisma.plan.findUnique({
    where: { id: planId },
    select: { name: true, billingInterval: true, trialDays: true },
  });
  if (!plan) throw new Error("플랜을 not found.");

  const now = new Date();
  const effectiveBillingInterval = (billingInterval ?? plan.billingInterval) as string;
  const effectiveTrialDays = trialDays ?? plan.trialDays ?? 0;

  let subscriptionData: Record<string, unknown>;

  if (effectiveTrialDays > 0) {
    const trialEnd = new Date(now);
    trialEnd.setDate(trialEnd.getDate() + effectiveTrialDays);
    subscriptionData = {
      tenantId,
      planId,
      billingInterval: effectiveBillingInterval,
      status: "TRIAL",
      trialStart: now,
      trialEnd,
    };
  } else {
    const periodEnd = new Date(now);
    if (effectiveBillingInterval === "YEARLY") {
      periodEnd.setDate(periodEnd.getDate() + 365);
    } else {
      periodEnd.setDate(periodEnd.getDate() + 30);
    }
    subscriptionData = {
      tenantId,
      planId,
      billingInterval: effectiveBillingInterval,
      status: "ACTIVE",
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
    };
  }

  const subscription = await prisma.tenantSubscription.create({
    data: subscriptionData as never,
    select: { id: true },
  });

  await prisma.tenantSubscriptionEvent.create({
    data: {
      tenantSubscriptionId: subscription.id,
      tenantId,
      eventType: "PLAN_ASSIGNED",
      actorUserId,
      toPlanId: planId,
      note: note ?? null,
    },
  });

  await prisma.billingRecord.create({
    data: {
      tenantId,
      tenantSubscriptionId: subscription.id,
      recordType: "NOTE",
      status: "OPEN",
      summary: `Plan assigned: ${plan.name}`,
    },
  });

  await auditAdminTenantPlanAssigned(tenantId, subscription.id, actorUserId, { planId });
  return { subscriptionId: subscription.id };
}

export async function changeTenantPlan(input: ChangeTenantPlanInput): Promise<void> {
  const { tenantId, subscriptionId, newPlanId, note, actorUserId } = input;

  const subscription = await prisma.tenantSubscription.findUnique({
    where: { id: subscriptionId },
    select: { id: true, tenantId: true, planId: true },
  });
  if (!subscription) throw new Error("구독을 not found.");
  if (subscription.tenantId !== tenantId) throw new Error("구독이 해당 Tenant에 속하지 않습니다.");

  const fromPlanId = subscription.planId;

  await prisma.tenantSubscription.update({
    where: { id: subscriptionId },
    data: { planId: newPlanId },
  });

  await prisma.tenantSubscriptionEvent.create({
    data: {
      tenantSubscriptionId: subscriptionId,
      tenantId,
      eventType: "PLAN_CHANGED",
      actorUserId,
      fromPlanId,
      toPlanId: newPlanId,
      note: note ?? null,
    },
  });

  await auditAdminTenantPlanChanged(tenantId, subscriptionId, actorUserId, {
    fromPlanId,
    toPlanId: newPlanId,
  });
}

export async function extendTenantTrial(input: ExtendTenantTrialInput): Promise<void> {
  const { tenantId, subscriptionId, extensionDays, note, actorUserId } = input;

  const subscription = await prisma.tenantSubscription.findUnique({
    where: { id: subscriptionId },
    select: { id: true, tenantId: true, status: true, trialEnd: true },
  });
  if (!subscription) throw new Error("구독을 not found.");
  if (subscription.tenantId !== tenantId) throw new Error("구독이 해당 Tenant에 속하지 않습니다.");
  if (subscription.status !== "TRIAL") throw new Error("Trial Status의 구독만 연장할 수 있습니다.");

  const base = subscription.trialEnd ?? new Date();
  const newTrialEnd = new Date(base);
  newTrialEnd.setDate(newTrialEnd.getDate() + extensionDays);

  await prisma.tenantSubscription.update({
    where: { id: subscriptionId },
    data: { trialEnd: newTrialEnd },
  });

  await prisma.tenantSubscriptionEvent.create({
    data: {
      tenantSubscriptionId: subscriptionId,
      tenantId,
      eventType: "TRIAL_EXTENDED",
      actorUserId,
      note: note ?? null,
    },
  });

  await auditAdminTenantTrialExtended(tenantId, subscriptionId, actorUserId, {
    extensionDays,
    newTrialEnd,
  });
}

export async function updateTenantSubscriptionStatus(
  input: UpdateTenantSubscriptionStatusInput
): Promise<void> {
  const { tenantId, subscriptionId, newStatus, note, actorUserId } = input;

  const subscription = await prisma.tenantSubscription.findUnique({
    where: { id: subscriptionId },
    select: { id: true, tenantId: true, status: true },
  });
  if (!subscription) throw new Error("구독을 not found.");
  if (subscription.tenantId !== tenantId) throw new Error("구독이 해당 Tenant에 속하지 않습니다.");

  const fromStatus = subscription.status as string;
  const now = new Date();

  const statusData: Record<string, unknown> = { status: newStatus };
  if (newStatus === "SUSPENDED") statusData.suspendedAt = now;
  else if (newStatus === "CANCELLED") statusData.cancelledAt = now;
  else if (newStatus === "ACTIVE") statusData.reactivatedAt = now;

  await prisma.tenantSubscription.update({
    where: { id: subscriptionId },
    data: statusData as never,
  });

  await prisma.tenantSubscriptionEvent.create({
    data: {
      tenantSubscriptionId: subscriptionId,
      tenantId,
      eventType: "STATUS_CHANGED",
      actorUserId,
      fromStatus,
      toStatus: newStatus,
      note: note ?? null,
    },
  });

  await auditAdminTenantSubscriptionStatusChanged(tenantId, subscriptionId, actorUserId, {
    fromStatus,
    toStatus: newStatus,
  });
}

export async function updateTenantBillingAccount(
  input: UpdateTenantBillingAccountInput
): Promise<void> {
  const { tenantId, actorUserId, ...fields } = input;

  const upserted = await prisma.tenantBillingAccount.upsert({
    where: { tenantId },
    create: {
      tenantId,
      billingEmail: fields.billingEmail ?? "",
      companyName: fields.companyName ?? null,
      legalName: fields.legalName ?? null,
      taxNumber: fields.taxNumber ?? null,
      addressLine1: fields.addressLine1 ?? null,
      addressLine2: fields.addressLine2 ?? null,
      city: fields.city ?? null,
      region: fields.region ?? null,
      postalCode: fields.postalCode ?? null,
      countryCode: fields.countryCode ?? null,
      externalCustomerRef: fields.externalCustomerRef ?? null,
      notes: fields.notes ?? null,
    },
    update: {
      ...(fields.billingEmail !== undefined ? { billingEmail: fields.billingEmail } : {}),
      ...(fields.companyName !== undefined ? { companyName: fields.companyName } : {}),
      ...(fields.legalName !== undefined ? { legalName: fields.legalName } : {}),
      ...(fields.taxNumber !== undefined ? { taxNumber: fields.taxNumber } : {}),
      ...(fields.addressLine1 !== undefined ? { addressLine1: fields.addressLine1 } : {}),
      ...(fields.addressLine2 !== undefined ? { addressLine2: fields.addressLine2 } : {}),
      ...(fields.city !== undefined ? { city: fields.city } : {}),
      ...(fields.region !== undefined ? { region: fields.region } : {}),
      ...(fields.postalCode !== undefined ? { postalCode: fields.postalCode } : {}),
      ...(fields.countryCode !== undefined ? { countryCode: fields.countryCode } : {}),
      ...(fields.externalCustomerRef !== undefined
        ? { externalCustomerRef: fields.externalCustomerRef }
        : {}),
      ...(fields.notes !== undefined ? { notes: fields.notes } : {}),
    },
    select: { id: true },
  });

  await auditAdminTenantBillingAccountUpdated(tenantId, upserted.id, actorUserId);
}

export async function addTenantBillingRecord(
  input: AddBillingRecordInput
): Promise<{ id: string }> {
  const {
    tenantId,
    tenantSubscriptionId,
    recordType,
    status,
    amountMinor,
    currencyCode,
    dueAt,
    summary,
    metadataJson,
    actorUserId,
  } = input;

  const record = await prisma.billingRecord.create({
    data: {
      tenantId,
      tenantSubscriptionId: tenantSubscriptionId ?? null,
      recordType: recordType as never,
      status: (status ?? "OPEN") as never,
      amountMinor: amountMinor ?? null,
      currencyCode: currencyCode ?? null,
      dueAt: dueAt ?? null,
      summary,
      ...(metadataJson != null ? { metadataJson: metadataJson as never } : {}),
    },
    select: { id: true },
  });

  if (recordType === "NOTE" && tenantSubscriptionId) {
    await prisma.tenantSubscriptionEvent.create({
      data: {
        tenantSubscriptionId,
        tenantId,
        eventType: "BILLING_NOTE_ADDED",
        actorUserId,
        note: summary,
      },
    });
  }

  await auditAdminTenantBillingRecordAdded(tenantId, record.id, actorUserId, { recordType });
  return { id: record.id };
}
