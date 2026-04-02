/**
 * Owner Billing Service — Phase 6 Billing Deep Dive.
 *
 * Provides all billing data access and plan-change logic for the owner console.
 * Business logic is kept here; React components only consume typed results.
 *
 * Provider integration is behind the BillingProviderAdapter boundary.
 * The mock adapter is used until a real provider (Stripe) is configured.
 */
import { prisma } from "@/lib/prisma";
import { calculateTenantCurrentUsage } from "@/lib/billing/usage";
import {
  labelOwnerSubscriptionStatus,
  labelOwnerInvoiceStatus,
  labelOwnerUsageStatus,
  colorOwnerUsageStatus,
  labelOwnerMetricKey,
  OWNER_METRIC_UNITS,
  type OwnerSubscriptionStatusType,
  type OwnerBillingInvoiceStatusType,
  type OwnerUsageMetricStatusType,
} from "@/lib/billing/labels";
import { formatPriceMinor } from "@/lib/billing/labels";
import { mockBillingAdapter } from "@/adapters/billing";
import type {
  OwnerBillingOverview,
  OwnerSubscriptionSummary,
  OwnerPlanDetail,
  OwnerPlanLimit,
  OwnerPlanFeature,
  OwnerUsageMetric,
  OwnerInvoiceRow,
  OwnerInvoiceDetail,
  OwnerInvoiceListResult,
  OwnerPlanCatalog,
  OwnerPlanCatalogItem,
  OwnerPlanChangePreview,
  OwnerPlanChangeLimitDiff,
  OwnerPlanChangeBlockingReason,
  BillingAlert,
} from "@/types/owner-billing";

// ─── Usage metric mapping ──────────────────────────────────────────────────────

interface MetricMapEntry {
  metricKey: string;
  limitKeys: string[];
  getValue: (u: Awaited<ReturnType<typeof calculateTenantCurrentUsage>>) => number;
}

const METRIC_MAP: MetricMapEntry[] = [
  { metricKey: "stores.max", limitKeys: ["stores.max", "max_stores"], getValue: (u) => u.storesCount },
  { metricKey: "staff.max", limitKeys: ["staff.max", "max_users"], getValue: (u) => u.usersCount },
  { metricKey: "channels.max", limitKeys: ["channels.max", "max_active_integrations"], getValue: (u) => u.activeIntegrationsCount },
  { metricKey: "orders.monthly", limitKeys: ["orders.monthly", "monthly_order_limit"], getValue: (u) => u.ordersCount },
  { metricKey: "subscriptions.monthly", limitKeys: ["subscriptions.monthly"], getValue: (u) => u.subscriptionsCount },
];

// ─── Private helpers ───────────────────────────────────────────────────────────

function mapSubscriptionToSummary(
  sub: {
    id: string;
    planId: string;
    status: string;
    billingInterval: string;
    currentPeriodStart: Date | null;
    currentPeriodEnd: Date | null;
    nextBillingAt: Date | null;
    trialStart: Date | null;
    trialEnd: Date | null;
    cancelAtPeriodEnd: boolean;
    cancelledAt: Date | null;
    plan: {
      id: string;
      code: string;
      name: string;
      priceAmountMinor: number;
      currencyCode: string;
    };
  }
): OwnerSubscriptionSummary {
  return {
    id: sub.id,
    planId: sub.planId,
    planCode: sub.plan.code,
    planName: sub.plan.name,
    status: sub.status as OwnerSubscriptionStatusType,
    statusLabel: labelOwnerSubscriptionStatus(sub.status as OwnerSubscriptionStatusType),
    billingInterval: sub.billingInterval as OwnerSubscriptionSummary["billingInterval"],
    currentPeriodStart: sub.currentPeriodStart,
    currentPeriodEnd: sub.currentPeriodEnd,
    nextBillingAt: sub.nextBillingAt,
    trialStart: sub.trialStart,
    trialEnd: sub.trialEnd,
    cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
    cancelledAt: sub.cancelledAt,
    priceAmountMinor: sub.plan.priceAmountMinor,
    currencyCode: sub.plan.currencyCode,
  };
}

function mapPlanToDetail(plan: {
  id: string;
  code: string;
  name: string;
  description: string | null;
  billingInterval: string;
  priceAmountMinor: number;
  currencyCode: string;
  isDefault: boolean;
  sortOrder: number;
  limits: Array<{ key: string; valueInt: number | null; valueText: string | null; valueBool: boolean | null; unit: string | null }>;
  features: Array<{ key: string; enabled: boolean }>;
  trialDays?: number | null;
}): OwnerPlanDetail {
  return {
    id: plan.id,
    code: plan.code,
    name: plan.name,
    description: plan.description,
    billingInterval: plan.billingInterval as OwnerPlanDetail["billingInterval"],
    priceAmountMinor: plan.priceAmountMinor,
    currencyCode: plan.currencyCode,
    isDefault: plan.isDefault,
    sortOrder: plan.sortOrder,
    trialDays: plan.trialDays ?? null,
    limits: plan.limits.map((l): OwnerPlanLimit => ({
      key: l.key,
      label: labelOwnerMetricKey(l.key),
      valueInt: l.valueInt,
      valueText: l.valueText,
      valueBool: l.valueBool,
      unit: l.unit,
    })),
    features: plan.features.map((f): OwnerPlanFeature => ({
      key: f.key,
      enabled: f.enabled,
      label: labelOwnerMetricKey(f.key),
    })),
  };
}

function mapInvoiceToRow(inv: {
  id: string;
  invoiceNumber: string | null;
  status: string;
  currency: string;
  totalMinor: number;
  amountDueMinor: number;
  billedAt: Date | null;
  dueAt: Date | null;
  paidAt: Date | null;
  billingPeriodStart: Date | null;
  billingPeriodEnd: Date | null;
  hostedInvoiceUrl: string | null;
  pdfUrl: string | null;
}): OwnerInvoiceRow {
  return {
    id: inv.id,
    invoiceNumber: inv.invoiceNumber,
    status: inv.status as OwnerBillingInvoiceStatusType,
    statusLabel: labelOwnerInvoiceStatus(inv.status as OwnerBillingInvoiceStatusType),
    currency: inv.currency,
    totalMinor: inv.totalMinor,
    amountDueMinor: inv.amountDueMinor,
    billedAt: inv.billedAt,
    dueAt: inv.dueAt,
    paidAt: inv.paidAt,
    billingPeriodStart: inv.billingPeriodStart,
    billingPeriodEnd: inv.billingPeriodEnd,
    hostedInvoiceUrl: inv.hostedInvoiceUrl,
    pdfUrl: inv.pdfUrl,
  };
}

// ─── 1. getBillingOverview ─────────────────────────────────────────────────────

export async function getBillingOverview(tenantId: string): Promise<OwnerBillingOverview> {
  const sub = await prisma.tenantSubscription.findFirst({
    where: {
      tenantId,
      status: { in: ["ACTIVE", "TRIAL", "PAST_DUE", "SUSPENDED", "INCOMPLETE"] as never[] },
    },
    include: {
      plan: {
        include: { limits: true, features: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const [usageMetrics, invoicesResult, alerts] = await Promise.all([
    getUsageVsLimits(tenantId),
    listBillingInvoices(tenantId, { page: 1, pageSize: 5 }),
    getBillingAlerts(tenantId),
  ]);

  const subscription = sub ? mapSubscriptionToSummary(sub) : null;
  const plan = sub ? mapPlanToDetail(sub.plan) : null;

  const status = sub?.status as OwnerSubscriptionStatusType | undefined;
  const billingStatusLabel = status ? labelOwnerSubscriptionStatus(status) : "No subscription";

  let trialDaysRemaining: number | null = null;
  if (status === "TRIAL" && sub?.trialEnd) {
    trialDaysRemaining = Math.ceil(
      (sub.trialEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );
  }

  const quickActions = [
    {
      id: "change-plan",
      label: "Change plan",
      href: "/owner/billing/plans",
      variant: "primary" as const,
      show: true,
    },
    {
      id: "view-invoices",
      label: "View invoices",
      href: "/owner/billing/invoices",
      variant: "secondary" as const,
      show: true,
    },
    {
      id: "retry-payment",
      label: "Retry payment",
      href: "/owner/billing/invoices",
      variant: "danger" as const,
      show: status === "PAST_DUE" || status === "INCOMPLETE",
    },
  ];

  return {
    subscription,
    plan,
    billingStatusLabel,
    nextBillingDate: sub?.nextBillingAt ?? sub?.currentPeriodEnd ?? null,
    paymentMethodSummary: null,
    trialDaysRemaining,
    alerts,
    usageMetrics,
    recentInvoices: invoicesResult.items,
    quickActions,
  };
}

// ─── 2. getUsageVsLimits ──────────────────────────────────────────────────────

export async function getUsageVsLimits(tenantId: string): Promise<OwnerUsageMetric[]> {
  const sub = await prisma.tenantSubscription.findFirst({
    where: {
      tenantId,
      status: { in: ["ACTIVE", "TRIAL", "PAST_DUE", "SUSPENDED", "INCOMPLETE"] as never[] },
    },
    include: {
      plan: { include: { limits: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const limits = sub?.plan?.limits ?? [];
  const limitsByKey = new Map(limits.map((l) => [l.key, l]));

  const usage = await calculateTenantCurrentUsage(tenantId);

  return METRIC_MAP.map((entry): OwnerUsageMetric => {
    const currentValue = entry.getValue(usage);

    const limitRecord = entry.limitKeys.reduce<(typeof limits)[number] | undefined>(
      (found, key) => found ?? limitsByKey.get(key),
      undefined
    );

    const limitValue = limitRecord?.valueInt ?? null;
    const unit = OWNER_METRIC_UNITS[entry.metricKey] ?? "";

    if (limitValue === null) {
      return {
        metricKey: entry.metricKey,
        label: labelOwnerMetricKey(entry.metricKey),
        currentValue,
        limitValue: null,
        utilizationPercent: null,
        status: "NORMAL",
        statusLabel: labelOwnerUsageStatus("NORMAL"),
        helperMessage: "",
        showUpgradeCta: false,
        unit,
      };
    }

    const utilizationPercent = limitValue > 0
      ? Math.round((currentValue / limitValue) * 100)
      : 100;

    let status: OwnerUsageMetricStatusType;
    if (currentValue > limitValue) {
      status = "EXCEEDED";
    } else if (currentValue === limitValue) {
      status = "REACHED";
    } else if (utilizationPercent >= 80) {
      status = "NEAR_LIMIT";
    } else {
      status = "NORMAL";
    }

    const helperMessage =
      status === "EXCEEDED"
        ? "You've exceeded this limit. Upgrade your plan."
        : status === "REACHED"
          ? "You've reached this limit."
          : status === "NEAR_LIMIT"
            ? "You're approaching this limit."
            : "";

    return {
      metricKey: entry.metricKey,
      label: labelOwnerMetricKey(entry.metricKey),
      currentValue,
      limitValue,
      utilizationPercent,
      status,
      statusLabel: labelOwnerUsageStatus(status),
      helperMessage,
      showUpgradeCta: status === "EXCEEDED" || status === "REACHED",
      unit,
    };
  });
}

// ─── 3. listBillingInvoices ───────────────────────────────────────────────────

export async function listBillingInvoices(
  tenantId: string,
  filters: { status?: string; page?: number; pageSize?: number }
): Promise<OwnerInvoiceListResult> {
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, filters.pageSize ?? 20));
  const skip = (page - 1) * pageSize;

  const where = {
    tenantId,
    ...(filters.status ? { status: filters.status as never } : {}),
  };

  const [total, items] = await Promise.all([
    prisma.billingInvoice.count({ where }),
    prisma.billingInvoice.findMany({
      where,
      orderBy: [{ billedAt: "desc" }, { createdAt: "desc" }],
      skip,
      take: pageSize,
    }),
  ]);

  return {
    items: items.map(mapInvoiceToRow),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

// ─── 4. getBillingInvoiceDetail ───────────────────────────────────────────────

export async function getBillingInvoiceDetail(
  tenantId: string,
  invoiceId: string
): Promise<OwnerInvoiceDetail | null> {
  const inv = await prisma.billingInvoice.findFirst({
    where: { id: invoiceId, tenantId },
    include: {
      lines: true,
      paymentAttempts: {
        orderBy: { attemptedAt: "desc" },
      },
    },
  });

  if (!inv) return null;

  return {
    ...mapInvoiceToRow(inv),
    subtotalMinor: inv.subtotalMinor,
    taxMinor: inv.taxMinor,
    amountPaidMinor: inv.amountPaidMinor,
    lines: inv.lines.map((l) => ({
      id: l.id,
      type: l.type,
      description: l.description,
      quantity: l.quantity,
      unitAmountMinor: l.unitAmountMinor,
      amountMinor: l.amountMinor,
    })),
    paymentAttempts: inv.paymentAttempts.map((a) => ({
      id: a.id,
      status: a.status as OwnerInvoiceDetail["paymentAttempts"][number]["status"],
      attemptedAt: a.attemptedAt,
      failureCode: a.failureCode,
      failureMessage: a.failureMessage,
      retryable: a.retryable,
    })),
  };
}

// ─── 5. getPlanCatalog ────────────────────────────────────────────────────────

export async function getPlanCatalog(tenantId: string): Promise<OwnerPlanCatalog> {
  const sub = await prisma.tenantSubscription.findFirst({
    where: {
      tenantId,
      status: { in: ["ACTIVE", "TRIAL", "PAST_DUE", "SUSPENDED", "INCOMPLETE"] as never[] },
    },
    include: { plan: { include: { limits: true, features: true } } },
    orderBy: { createdAt: "desc" },
  });

  const plans = await prisma.plan.findMany({
    where: { status: "ACTIVE" as never },
    include: { limits: true, features: true },
    orderBy: { sortOrder: "asc" },
  });

  const currentPlan = sub ? mapPlanToDetail(sub.plan) : null;
  const currentSortOrder = sub?.plan?.sortOrder ?? null;

  const featureKeySet = new Set<string>();
  for (const plan of plans) {
    for (const f of plan.features) {
      featureKeySet.add(f.key);
    }
  }
  const featureKeys = Array.from(featureKeySet);

  const catalogItems: OwnerPlanCatalogItem[] = plans.map((plan) => {
    const detail = mapPlanToDetail(plan);
    const isCurrent = sub?.planId === plan.id;

    let changeType: OwnerPlanCatalogItem["changeType"] = null;
    if (isCurrent) {
      changeType = "CURRENT";
    } else if (currentSortOrder !== null) {
      changeType = plan.sortOrder > currentSortOrder ? "UPGRADE" : "DOWNGRADE";
    }

    const priceDisplayMonthly =
      plan.billingInterval === "YEARLY"
        ? `${formatPriceMinor(Math.round(plan.priceAmountMinor / 12), plan.currencyCode)}/mo`
        : `${formatPriceMinor(plan.priceAmountMinor, plan.currencyCode)}/mo`;

    const priceDisplayYearly =
      plan.billingInterval === "YEARLY"
        ? `${formatPriceMinor(plan.priceAmountMinor, plan.currencyCode)}/yr`
        : null;

    return {
      ...detail,
      isCurrent,
      changeType,
      priceDisplayMonthly,
      priceDisplayYearly,
    };
  });

  return {
    currentPlan,
    plans: catalogItems,
    featureKeys,
  };
}

// ─── 6. previewPlanChange ─────────────────────────────────────────────────────

export async function previewPlanChange(
  tenantId: string,
  targetPlanCode: string
): Promise<OwnerPlanChangePreview> {
  const sub = await prisma.tenantSubscription.findFirst({
    where: {
      tenantId,
      status: { in: ["ACTIVE", "TRIAL", "PAST_DUE", "SUSPENDED", "INCOMPLETE"] as never[] },
    },
    include: { plan: { include: { limits: true, features: true } } },
    orderBy: { createdAt: "desc" },
  });

  if (!sub) {
    throw new Error("No active subscription found for tenant");
  }

  const targetPlan = await prisma.plan.findFirst({
    where: { code: targetPlanCode, status: "ACTIVE" as never },
    include: { limits: true, features: true },
  });

  if (!targetPlan) {
    throw new Error(`Plan not found or not active: ${targetPlanCode}`);
  }

  const currentPlan = sub.plan;
  const changeType: OwnerPlanChangePreview["changeType"] =
    targetPlan.sortOrder > currentPlan.sortOrder ? "UPGRADE" : "DOWNGRADE";

  const usage = await calculateTenantCurrentUsage(tenantId);

  const targetLimitsByKey = new Map(targetPlan.limits.map((l) => [l.key, l]));

  const limitDiffs: OwnerPlanChangeLimitDiff[] = [];
  const blockingReasons: OwnerPlanChangeBlockingReason[] = [];

  for (const entry of METRIC_MAP) {
    const currentLimitRecord = entry.limitKeys.reduce<(typeof currentPlan.limits)[number] | undefined>(
      (found, key) =>
        found ?? currentPlan.limits.find((l) => l.key === key),
      undefined
    );
    const targetLimitRecord = entry.limitKeys.reduce<(typeof targetPlan.limits)[number] | undefined>(
      (found, key) =>
        found ?? targetLimitsByKey.get(key),
      undefined
    );

    const currentVal = currentLimitRecord?.valueInt ?? null;
    const targetVal = targetLimitRecord?.valueInt ?? null;

    if (currentVal === null && targetVal === null) continue;

    const formatVal = (v: number | null) =>
      v === null ? "Unlimited" : String(v);

    const isReduction =
      currentVal !== null && targetVal !== null && targetVal < currentVal;

    const currentUsage = entry.getValue(usage);
    const wouldExceed = targetVal !== null && currentUsage > targetVal;

    limitDiffs.push({
      key: entry.metricKey,
      label: labelOwnerMetricKey(entry.metricKey),
      currentPlanValue: formatVal(currentVal),
      targetPlanValue: formatVal(targetVal),
      isReduction,
      currentUsage,
      wouldExceed,
    });

    if (changeType === "DOWNGRADE" && wouldExceed && targetVal !== null) {
      blockingReasons.push({
        metricKey: entry.metricKey,
        label: labelOwnerMetricKey(entry.metricKey),
        currentUsage,
        targetLimit: targetVal,
        message: `Your current usage (${currentUsage}) exceeds the ${formatVal(targetVal)} limit on the target plan.`,
      });
    }
  }

  const providerPreview = sub.providerSubscriptionId
    ? await mockBillingAdapter.previewPlanChange(sub.providerSubscriptionId, targetPlan.id)
    : null;

  const prorationPreviewMinor = providerPreview?.prorationMinor ?? null;
  const prorationDisplayText =
    prorationPreviewMinor !== null
      ? formatPriceMinor(prorationPreviewMinor, currentPlan.currencyCode)
      : null;

  const effectiveMode: OwnerPlanChangePreview["effectiveMode"] =
    changeType === "UPGRADE" ? "IMMEDIATE" : "NEXT_CYCLE";

  const isBlocked = blockingReasons.length > 0;

  const summaryText = isBlocked
    ? `Cannot downgrade to ${targetPlan.name}: you are over limit on ${blockingReasons.length} metric(s). Reduce usage first.`
    : changeType === "UPGRADE"
      ? `Upgrade from ${currentPlan.name} to ${targetPlan.name}. Change takes effect immediately.`
      : `Downgrade from ${currentPlan.name} to ${targetPlan.name}. Change takes effect at the end of your current billing period.`;

  return {
    currentPlan: mapPlanToDetail(currentPlan),
    targetPlan: mapPlanToDetail(targetPlan),
    changeType,
    effectiveMode,
    limitDiffs,
    prorationPreviewMinor,
    prorationDisplayText,
    blockingReasons,
    isBlocked,
    summaryText,
  };
}

// ─── 7. requestPlanChange ─────────────────────────────────────────────────────

export async function requestPlanChange(
  tenantId: string,
  targetPlanCode: string,
  userId: string
): Promise<{
  success: boolean;
  changeRequest: { id: string; status: string };
  blocked: boolean;
  blockingReasons?: OwnerPlanChangeBlockingReason[];
}> {
  const preview = await previewPlanChange(tenantId, targetPlanCode);

  const sub = await prisma.tenantSubscription.findFirst({
    where: {
      tenantId,
      status: { in: ["ACTIVE", "TRIAL", "PAST_DUE", "SUSPENDED", "INCOMPLETE"] as never[] },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!sub) throw new Error("No active subscription found for tenant");

  const targetPlan = await prisma.plan.findFirst({
    where: { code: targetPlanCode, status: "ACTIVE" as never },
  });

  if (!targetPlan) throw new Error(`Plan not found or not active: ${targetPlanCode}`);

  const changeStatus = preview.isBlocked ? "BLOCKED" : "CONFIRMED";

  const changeRequest = await prisma.subscriptionChangeRequest.create({
    data: {
      tenantId,
      currentPlanId: sub.planId,
      targetPlanId: targetPlan.id,
      changeType: preview.changeType as never,
      status: changeStatus as never,
      effectiveMode: preview.effectiveMode as never,
      prorationPreviewMinor: preview.prorationPreviewMinor,
      blockingReasonsJson: preview.isBlocked ? (preview.blockingReasons as never) : undefined,
      previewJson: preview as never,
      requestedByUserId: userId,
    },
  });

  await prisma.billingEventLog.create({
    data: {
      tenantId,
      subscriptionId: sub.id,
      eventType: `PLAN_CHANGE_${changeStatus}`,
      providerName: "internal",
      payloadJson: {
        changeRequestId: changeRequest.id,
        currentPlanId: sub.planId,
        targetPlanId: targetPlan.id,
        changeType: preview.changeType,
        effectiveMode: preview.effectiveMode,
      } as never,
    },
  });

  if (preview.isBlocked) {
    await prisma.auditLog.create({
      data: {
        tenantId,
        actorUserId: userId,
        action: "PLAN_CHANGE_BLOCKED",
        targetType: "SubscriptionChangeRequest",
        targetId: changeRequest.id,
        metadataJson: {
          targetPlanCode,
          blockingReasons: preview.blockingReasons,
        } as never,
      },
    });

    return {
      success: false,
      blocked: true,
      changeRequest: { id: changeRequest.id, status: changeRequest.status },
      blockingReasons: preview.blockingReasons,
    };
  }

  if (preview.changeType === "UPGRADE") {
    const fromPlanId = sub.planId;
    await prisma.tenantSubscription.update({
      where: { id: sub.id },
      data: { planId: targetPlan.id },
    });

    await prisma.tenantSubscriptionEvent.create({
      data: {
        tenantSubscriptionId: sub.id,
        tenantId,
        eventType: "PLAN_CHANGED" as never,
        actorUserId: userId,
        fromPlanId,
        toPlanId: targetPlan.id,
        note: `Upgraded to ${targetPlan.name} immediately.`,
      },
    });

    await prisma.subscriptionChangeRequest.update({
      where: { id: changeRequest.id },
      data: { status: "APPLIED" as never, appliedAt: new Date() },
    });
  }

  await prisma.auditLog.create({
    data: {
      tenantId,
      actorUserId: userId,
      action: preview.changeType === "UPGRADE" ? "PLAN_UPGRADED" : "PLAN_DOWNGRADE_SCHEDULED",
      targetType: "SubscriptionChangeRequest",
      targetId: changeRequest.id,
      metadataJson: {
        targetPlanCode,
        changeType: preview.changeType,
        effectiveMode: preview.effectiveMode,
      } as never,
    },
  });

  return {
    success: true,
    blocked: false,
    changeRequest: {
      id: changeRequest.id,
      status: preview.changeType === "UPGRADE" ? "APPLIED" : changeRequest.status,
    },
  };
}

// ─── 8. getBillingAlerts ──────────────────────────────────────────────────────

export async function getBillingAlerts(tenantId: string): Promise<BillingAlert[]> {
  const sub = await prisma.tenantSubscription.findFirst({
    where: {
      tenantId,
      status: { in: ["ACTIVE", "TRIAL", "PAST_DUE", "SUSPENDED", "INCOMPLETE"] as never[] },
    },
    orderBy: { createdAt: "desc" },
  });

  const alerts: BillingAlert[] = [];

  if (!sub) return alerts;

  const status = sub.status as OwnerSubscriptionStatusType;

  if (status === "PAST_DUE") {
    alerts.push({
      id: "alert-past-due",
      severity: "critical",
      title: "Payment overdue",
      message: "Update your payment method to avoid service interruption.",
      actionLabel: "Update payment method",
      actionHref: "/owner/billing/payment-method",
    });
  }

  if (status === "INCOMPLETE") {
    alerts.push({
      id: "alert-incomplete",
      severity: "critical",
      title: "Payment incomplete",
      message: "Your payment is incomplete. Please complete your payment.",
      actionLabel: "Complete payment",
      actionHref: "/owner/billing/invoices",
    });
  }

  if (status === "TRIAL" && sub.trialEnd) {
    const trialDaysRemaining = Math.ceil(
      (sub.trialEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );
    if (trialDaysRemaining <= 7) {
      alerts.push({
        id: "alert-trial-ending",
        severity: "warning",
        title: "Trial ending soon",
        message: `Your trial ends in ${trialDaysRemaining} days.`,
        actionLabel: "Choose a plan",
        actionHref: "/owner/billing/plans",
      });
    }
  }

  if (sub.cancelAtPeriodEnd) {
    alerts.push({
      id: "alert-cancel-at-period-end",
      severity: "info",
      title: "Subscription cancelling",
      message: "Your subscription will cancel at the end of the current billing period.",
      actionLabel: "Reactivate",
      actionHref: "/owner/billing/plans",
    });
  }

  const usageMetrics = await getUsageVsLimits(tenantId);
  for (const metric of usageMetrics) {
    if (metric.status === "EXCEEDED" || metric.status === "NEAR_LIMIT") {
      alerts.push({
        id: `alert-usage-${metric.metricKey}`,
        severity: "warning",
        title: `Plan limit: ${metric.label}`,
        message: `You are close to your plan limit for ${metric.label}.`,
        actionLabel: "Upgrade plan",
        actionHref: "/owner/billing/plans",
      });
    }
  }

  return alerts;
}
