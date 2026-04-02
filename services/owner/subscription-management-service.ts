/**
 * Owner Subscription Management Service — pause, resume, cancel, next-date, note.
 *
 * Valid status transitions:
 *   ACTIVE  → PAUSED    (pause)
 *   ACTIVE  → CANCELLED (cancel)
 *   PAUSED  → ACTIVE    (resume)
 *   PAUSED  → CANCELLED (cancel)
 *
 * Invalid / blocked transitions:
 *   CANCELLED → any
 *   ACTIVE → ACTIVE (resume on already active)
 *   PAUSED → PAUSED (pause on already paused)
 */
import { prisma } from "@/lib/prisma";
import { logAuditEvent } from "@/lib/audit";

export class SubscriptionTransitionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SubscriptionTransitionError";
  }
}

/**
 * Verifies subscription belongs to the given tenant.
 * Returns the subscription or throws.
 */
async function requireSubscriptionInTenant(subscriptionId: string, tenantId: string) {
  const sub = await prisma.subscription.findUnique({
    where: { id: subscriptionId },
    include: { plan: { include: { store: { select: { tenantId: true, id: true, name: true } } } } },
  });

  if (!sub) throw new Error("SUBSCRIPTION_NOT_FOUND");
  if (sub.plan.store.tenantId !== tenantId) throw new Error("CROSS_TENANT_ACCESS_DENIED");

  return sub;
}

export async function pauseOwnerSubscription(
  subscriptionId: string,
  tenantId: string,
  actor: { userId: string },
  reason?: string
): Promise<void> {
  const sub = await requireSubscriptionInTenant(subscriptionId, tenantId);

  if (sub.status === "CANCELLED") {
    throw new SubscriptionTransitionError("Cannot pause a cancelled subscription.");
  }
  if (sub.status === "PAUSED") {
    throw new SubscriptionTransitionError("Subscription is already paused.");
  }

  const now = new Date();
  await prisma.subscription.update({
    where: { id: subscriptionId },
    data: {
      status: "PAUSED",
      pausedAt: now,
      cancelReason: reason ?? sub.cancelReason,
    },
  });

  await logAuditEvent({
    tenantId,
    storeId: sub.plan.store.id,
    actorUserId: actor.userId,
    action: "OWNER_SUBSCRIPTION_PAUSED",
    targetType: "Subscription",
    targetId: subscriptionId,
    metadata: {
      customerId: sub.customerId,
      planId: sub.planId,
      before: { status: sub.status },
      after: { status: "PAUSED" },
      reason: reason ?? null,
    },
  });
}

export async function resumeOwnerSubscription(
  subscriptionId: string,
  tenantId: string,
  actor: { userId: string }
): Promise<void> {
  const sub = await requireSubscriptionInTenant(subscriptionId, tenantId);

  if (sub.status === "CANCELLED") {
    throw new SubscriptionTransitionError("Cannot resume a cancelled subscription.");
  }
  if (sub.status === "ACTIVE") {
    throw new SubscriptionTransitionError("Subscription is already active.");
  }

  await prisma.subscription.update({
    where: { id: subscriptionId },
    data: {
      status: "ACTIVE",
      pausedAt: null,
    },
  });

  await logAuditEvent({
    tenantId,
    storeId: sub.plan.store.id,
    actorUserId: actor.userId,
    action: "OWNER_SUBSCRIPTION_RESUMED",
    targetType: "Subscription",
    targetId: subscriptionId,
    metadata: {
      customerId: sub.customerId,
      planId: sub.planId,
      before: { status: sub.status },
      after: { status: "ACTIVE" },
    },
  });
}

export async function cancelOwnerSubscription(
  subscriptionId: string,
  tenantId: string,
  actor: { userId: string },
  reason?: string
): Promise<void> {
  const sub = await requireSubscriptionInTenant(subscriptionId, tenantId);

  if (sub.status === "CANCELLED") {
    throw new SubscriptionTransitionError("Subscription is already cancelled.");
  }

  const now = new Date();
  await prisma.subscription.update({
    where: { id: subscriptionId },
    data: {
      status: "CANCELLED",
      cancelledAt: now,
      cancelReason: reason ?? null,
    },
  });

  await logAuditEvent({
    tenantId,
    storeId: sub.plan.store.id,
    actorUserId: actor.userId,
    action: "OWNER_SUBSCRIPTION_CANCELLED",
    targetType: "Subscription",
    targetId: subscriptionId,
    metadata: {
      customerId: sub.customerId,
      planId: sub.planId,
      before: { status: sub.status },
      after: { status: "CANCELLED" },
      reason: reason ?? null,
    },
  });
}

export async function updateOwnerSubscriptionNextDate(
  subscriptionId: string,
  tenantId: string,
  nextDate: Date,
  actor: { userId: string }
): Promise<void> {
  const sub = await requireSubscriptionInTenant(subscriptionId, tenantId);

  if (sub.status === "CANCELLED") {
    throw new SubscriptionTransitionError("Cannot update next date on a cancelled subscription.");
  }
  if (nextDate < new Date()) {
    throw new Error("Next order date must be in the future.");
  }

  await prisma.subscription.update({
    where: { id: subscriptionId },
    data: {
      nextOrderAt: nextDate,
      nextBillingDate: nextDate,
    },
  });

  await logAuditEvent({
    tenantId,
    storeId: sub.plan.store.id,
    actorUserId: actor.userId,
    action: "OWNER_SUBSCRIPTION_NEXT_DATE_UPDATED",
    targetType: "Subscription",
    targetId: subscriptionId,
    metadata: {
      customerId: sub.customerId,
      planId: sub.planId,
      before: { nextBillingDate: sub.nextBillingDate, nextOrderAt: sub.nextOrderAt },
      after: { nextBillingDate: nextDate, nextOrderAt: nextDate },
    },
  });
}

export async function updateOwnerSubscriptionNote(
  subscriptionId: string,
  tenantId: string,
  note: string,
  actor: { userId: string }
): Promise<void> {
  const sub = await requireSubscriptionInTenant(subscriptionId, tenantId);

  const oldNote = sub.internalNote;
  await prisma.subscription.update({
    where: { id: subscriptionId },
    data: { internalNote: note },
  });

  await logAuditEvent({
    tenantId,
    storeId: sub.plan.store.id,
    actorUserId: actor.userId,
    action: "OWNER_SUBSCRIPTION_NOTE_UPDATED",
    targetType: "Subscription",
    targetId: subscriptionId,
    metadata: {
      customerId: sub.customerId,
      planId: sub.planId,
      before: { note: oldNote },
      after: { note },
    },
  });
}
