/**
 * Billing Scheduler
 *
 * Identifies tenant subscriptions that are due for renewal within the
 * configured lookahead window.
 *
 * Usage:
 *   - Call getSubscriptionsDueForRenewal() from a cron/scheduled task or admin trigger
 *   - Process each result: generate invoice, charge payment method via BillingProviderAdapter
 *
 * NOTE: Actual charging is delegated to the BillingProviderAdapter.
 * This module only identifies what's due and records audit events.
 */
import { prisma } from "@/lib/prisma";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SubscriptionDueForRenewal {
  tenantId: string;
  subscriptionId: string;
  planId: string;
  status: string;
  billingInterval: string;
  currentPeriodEnd: Date;
  daysUntilRenewal: number;
  providerSubscriptionId: string | null;
  providerCustomerId: string | null;
}

export interface BillingSchedulerResult {
  processedAt: Date;
  lookaheadDays: number;
  subscriptionsDue: SubscriptionDueForRenewal[];
  totalCount: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const RENEWABLE_STATUSES = ["ACTIVE", "TRIAL", "PAST_DUE"] as const;

// ─── Main function ────────────────────────────────────────────────────────────

/**
 * Returns all subscriptions with currentPeriodEnd within the lookahead window.
 *
 * @param lookaheadDays  Number of days ahead to look (default: 3)
 */
export async function getSubscriptionsDueForRenewal(
  lookaheadDays = 3
): Promise<BillingSchedulerResult> {
  const now = new Date();
  const cutoff = new Date(now.getTime() + lookaheadDays * 24 * 60 * 60 * 1000);

  const subscriptions = await prisma.tenantSubscription.findMany({
    where: {
      status: { in: [...RENEWABLE_STATUSES] },
      currentPeriodEnd: { lte: cutoff },
      cancelAtPeriodEnd: false,
    },
    select: {
      id: true,
      tenantId: true,
      planId: true,
      status: true,
      billingInterval: true,
      currentPeriodEnd: true,
      providerSubscriptionId: true,
      providerCustomerId: true,
    },
    orderBy: { currentPeriodEnd: "asc" },
  });

  const result: SubscriptionDueForRenewal[] = subscriptions.map((sub) => {
    const periodEnd = sub.currentPeriodEnd!;
    const msRemaining = periodEnd.getTime() - now.getTime();
    const daysUntilRenewal = Math.max(
      0,
      Math.floor(msRemaining / (24 * 60 * 60 * 1000))
    );

    return {
      tenantId: sub.tenantId,
      subscriptionId: sub.id,
      planId: sub.planId,
      status: sub.status,
      billingInterval: sub.billingInterval,
      currentPeriodEnd: periodEnd,
      daysUntilRenewal,
      providerSubscriptionId: sub.providerSubscriptionId ?? null,
      providerCustomerId: sub.providerCustomerId ?? null,
    };
  });

  return {
    processedAt: now,
    lookaheadDays,
    subscriptionsDue: result,
    totalCount: result.length,
  };
}

/**
 * Mark a subscription as PAST_DUE when its period has expired without renewal.
 * Safe to call idempotently — only transitions from ACTIVE.
 */
export async function markSubscriptionPastDue(subscriptionId: string): Promise<boolean> {
  const sub = await prisma.tenantSubscription.findUnique({
    where: { id: subscriptionId },
    select: { status: true, tenantId: true },
  });
  if (!sub || sub.status !== "ACTIVE") return false;

  await prisma.$transaction([
    prisma.tenantSubscription.update({
      where: { id: subscriptionId },
      data: { status: "PAST_DUE" as never },
    }),
    prisma.tenantSubscriptionEvent.create({
      data: {
        tenantSubscriptionId: subscriptionId,
        tenantId: sub.tenantId,
        eventType: "STATUS_CHANGED" as never,
        fromStatus: "ACTIVE" as never,
        toStatus: "PAST_DUE" as never,
        note: "Subscription period expired without successful payment",
      },
    }),
  ]);

  return true;
}
