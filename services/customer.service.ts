/**
 * Customer Service — customer-facing order, subscription and account management.
 *
 * Design principles:
 * - Orders are looked up by customerEmail (the user's email on the Order record).
 * - Subscriptions are looked up via Customer records that share the user's email.
 * - All queries are scoped so that a customer can never see data belonging to
 *   other users.
 * - Password changes use bcrypt; plain-text passwords are never logged or stored.
 */

import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { logAuditEvent } from "@/lib/audit";
import type {
  CustomerOrderSummary,
  CustomerOrderListResult,
  CustomerOrderDetail,
  CustomerOrderListOptions,
  CustomerSubscriptionSummary,
  CustomerAccountInfo,
} from "@/types/customer";

// ─── Errors ───────────────────────────────────────────────────────────────────

export class CustomerOrderNotFoundError extends Error {
  constructor(id: string) {
    super(`Order not found: ${id}`);
    this.name = "CustomerOrderNotFoundError";
  }
}

export class CustomerSubscriptionNotFoundError extends Error {
  constructor(id: string) {
    super(`Subscription not found: ${id}`);
    this.name = "CustomerSubscriptionNotFoundError";
  }
}

export class CustomerSubscriptionOwnershipError extends Error {
  constructor() {
    super("Subscription does not belong to this customer.");
    this.name = "CustomerSubscriptionOwnershipError";
  }
}

export class CustomerSubscriptionTransitionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CustomerSubscriptionTransitionError";
  }
}

export class CustomerPasswordError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CustomerPasswordError";
  }
}

// ─── Orders ───────────────────────────────────────────────────────────────────

/**
 * Returns a paginated list of orders placed by the given user (matched by email).
 */
export async function listCustomerOrders(
  userEmail: string,
  opts: CustomerOrderListOptions = {}
): Promise<CustomerOrderListResult> {
  const { limit = 20, offset = 0, status } = opts;

  const where = {
    customerEmail: userEmail,
    ...(status
      ? { status: Array.isArray(status) ? { in: status as string[] } : (status as string) }
      : {}),
  };

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      select: {
        id: true,
        status: true,
        sourceChannel: true,
        storeId: true,
        orderedAt: true,
        totalAmount: true,
        currencyCode: true,
        _count: { select: { items: true } },
      },
      orderBy: { orderedAt: "desc" },
      take: limit,
      skip: offset,
    }),
    prisma.order.count({ where }),
  ]);

  // Resolve store names
  const storeIds = [...new Set(orders.map((o) => o.storeId))];
  const stores = await prisma.store.findMany({
    where: { id: { in: storeIds } },
    select: { id: true, name: true },
  });
  const storeNameById = new Map(stores.map((s) => [s.id, s.name]));

  const summaries: CustomerOrderSummary[] = orders.map((o) => ({
    id: o.id,
    status: o.status,
    sourceChannel: o.sourceChannel,
    storeName: storeNameById.get(o.storeId) ?? null,
    orderedAt: o.orderedAt.toISOString(),
    totalAmount: o.totalAmount,
    currencyCode: o.currencyCode,
    itemCount: o._count.items,
  }));

  return { orders: summaries, total, limit, offset };
}

/**
 * Returns the full detail of a single order, verifying it belongs to the user.
 */
export async function getCustomerOrderDetail(
  orderId: string,
  userEmail: string
): Promise<CustomerOrderDetail> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: {
        include: {
          modifiers: true,
        },
        orderBy: { createdAt: "asc" },
      },
      events: {
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!order || order.customerEmail !== userEmail) {
    throw new CustomerOrderNotFoundError(orderId);
  }

  // Resolve store name
  const store = await prisma.store.findUnique({
    where: { id: order.storeId },
    select: { name: true },
  });

  return {
    id: order.id,
    status: order.status,
    sourceChannel: order.sourceChannel,
    storeName: store?.name ?? null,
    orderedAt: order.orderedAt.toISOString(),
    acceptedAt: order.acceptedAt?.toISOString() ?? null,
    completedAt: order.completedAt?.toISOString() ?? null,
    cancelledAt: order.cancelledAt?.toISOString() ?? null,
    subtotalAmount: order.subtotalAmount,
    discountAmount: order.discountAmount,
    taxAmount: order.taxAmount,
    tipAmount: order.tipAmount,
    totalAmount: order.totalAmount,
    currencyCode: order.currencyCode,
    notes: order.notes,
    items: order.items.map((item) => ({
      id: item.id,
      productName: item.productName,
      quantity: item.quantity,
      unitPriceAmount: item.unitPriceAmount,
      totalPriceAmount: item.totalPriceAmount,
      notes: item.notes,
      modifiers: item.modifiers.map((m) => ({
        modifierGroupName: m.modifierGroupName,
        modifierOptionName: m.modifierOptionName,
        quantity: m.quantity,
        unitPriceAmount: m.unitPriceAmount,
        totalPriceAmount: m.totalPriceAmount,
      })),
    })),
    events: order.events.map((e) => ({
      id: e.id,
      eventType: e.eventType,
      message: e.message,
      createdAt: e.createdAt.toISOString(),
    })),
  };
}

// ─── Subscriptions ────────────────────────────────────────────────────────────

/**
 * Returns all subscriptions belonging to the customer (matched by email across
 * all Customer records that share this user's email).
 */
export async function listCustomerSubscriptions(
  userEmail: string
): Promise<CustomerSubscriptionSummary[]> {
  // Find all Customer records linked to this email
  const customers = await prisma.customer.findMany({
    where: { email: userEmail },
    select: { id: true },
  });

  if (customers.length === 0) return [];

  const customerIds = customers.map((c) => c.id);

  const subscriptions = await prisma.subscription.findMany({
    where: { customerId: { in: customerIds } },
    include: {
      plan: {
        include: {
          store: { select: { id: true, name: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return subscriptions.map((sub) => ({
    id: sub.id,
    status: sub.status,
    planId: sub.planId,
    planName: sub.plan.name,
    planInterval: sub.plan.interval,
    planPrice: sub.plan.price,
    storeName: sub.plan.store.name,
    storeId: sub.plan.store.id,
    nextOrderAt: sub.nextOrderAt?.toISOString() ?? null,
    nextBillingDate: sub.nextBillingDate.toISOString(),
    startDate: sub.startDate.toISOString(),
    pausedAt: sub.pausedAt?.toISOString() ?? null,
    cancelledAt: sub.cancelledAt?.toISOString() ?? null,
  }));
}

/**
 * Verifies the subscription belongs to a Customer with the given email.
 * Throws CustomerSubscriptionOwnershipError if the check fails.
 */
async function requireSubscriptionOwnership(subscriptionId: string, userEmail: string) {
  const sub = await prisma.subscription.findUnique({
    where: { id: subscriptionId },
    include: {
      plan: { include: { store: { select: { id: true, name: true } } } },
    },
  });

  if (!sub) throw new CustomerSubscriptionNotFoundError(subscriptionId);

  const customer = await prisma.customer.findUnique({
    where: { id: sub.customerId },
    select: { email: true },
  });

  if (!customer || customer.email !== userEmail) {
    throw new CustomerSubscriptionOwnershipError();
  }

  return sub;
}

export async function pauseCustomerSubscription(
  subscriptionId: string,
  userEmail: string
): Promise<void> {
  const sub = await requireSubscriptionOwnership(subscriptionId, userEmail);

  if (sub.status === "CANCELLED") {
    throw new CustomerSubscriptionTransitionError("Cannot pause a cancelled subscription.");
  }
  if (sub.status === "PAUSED") {
    throw new CustomerSubscriptionTransitionError("Subscription is already paused.");
  }

  await prisma.subscription.update({
    where: { id: subscriptionId },
    data: { status: "PAUSED", pausedAt: new Date() },
  });

  await logAuditEvent({
    tenantId: sub.tenantId,
    storeId: sub.plan.store.id,
    action: "CUSTOMER_SUBSCRIPTION_PAUSED",
    targetType: "Subscription",
    targetId: subscriptionId,
    metadata: { customerId: sub.customerId, planId: sub.planId },
  });
}

export async function resumeCustomerSubscription(
  subscriptionId: string,
  userEmail: string
): Promise<void> {
  const sub = await requireSubscriptionOwnership(subscriptionId, userEmail);

  if (sub.status === "CANCELLED") {
    throw new CustomerSubscriptionTransitionError("Cannot resume a cancelled subscription.");
  }
  if (sub.status === "ACTIVE") {
    throw new CustomerSubscriptionTransitionError("Subscription is already active.");
  }

  await prisma.subscription.update({
    where: { id: subscriptionId },
    data: { status: "ACTIVE", pausedAt: null },
  });

  await logAuditEvent({
    tenantId: sub.tenantId,
    storeId: sub.plan.store.id,
    action: "CUSTOMER_SUBSCRIPTION_RESUMED",
    targetType: "Subscription",
    targetId: subscriptionId,
    metadata: { customerId: sub.customerId, planId: sub.planId },
  });
}

export async function cancelCustomerSubscription(
  subscriptionId: string,
  userEmail: string
): Promise<void> {
  const sub = await requireSubscriptionOwnership(subscriptionId, userEmail);

  if (sub.status === "CANCELLED") {
    throw new CustomerSubscriptionTransitionError("Subscription is already cancelled.");
  }

  await prisma.subscription.update({
    where: { id: subscriptionId },
    data: { status: "CANCELLED", cancelledAt: new Date() },
  });

  await logAuditEvent({
    tenantId: sub.tenantId,
    storeId: sub.plan.store.id,
    action: "CUSTOMER_SUBSCRIPTION_CANCELLED",
    targetType: "Subscription",
    targetId: subscriptionId,
    metadata: { customerId: sub.customerId, planId: sub.planId },
  });
}

export async function updateNextOrderDate(
  subscriptionId: string,
  userEmail: string,
  nextOrderAt: Date
): Promise<void> {
  const sub = await requireSubscriptionOwnership(subscriptionId, userEmail);

  if (sub.status === "CANCELLED") {
    throw new CustomerSubscriptionTransitionError(
      "Cannot update next order date on a cancelled subscription."
    );
  }

  if (nextOrderAt <= new Date()) {
    throw new CustomerSubscriptionTransitionError(
      "Next order date must be in the future."
    );
  }

  await prisma.subscription.update({
    where: { id: subscriptionId },
    data: { nextOrderAt },
  });

  await logAuditEvent({
    tenantId: sub.tenantId,
    storeId: sub.plan.store.id,
    action: "CUSTOMER_SUBSCRIPTION_NEXT_DATE_UPDATED",
    targetType: "Subscription",
    targetId: subscriptionId,
    metadata: { customerId: sub.customerId, planId: sub.planId, nextOrderAt },
  });
}

// ─── Account ──────────────────────────────────────────────────────────────────

export async function getCustomerAccount(userId: string): Promise<CustomerAccountInfo | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, phone: true },
  });
  if (!user) return null;
  return { id: user.id, name: user.name, email: user.email, phone: user.phone };
}

export async function updateCustomerName(
  userId: string,
  name: string
): Promise<void> {
  const trimmed = name.trim();
  if (!trimmed) throw new Error("Name cannot be empty.");

  await prisma.user.update({
    where: { id: userId },
    data: { name: trimmed },
  });
}

export async function changeCustomerPassword(
  userId: string,
  currentPassword: string,
  newPassword: string
): Promise<void> {
  if (newPassword.length < 8) {
    throw new CustomerPasswordError("New password must be at least 8 characters.");
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { passwordHash: true },
  });

  if (!user || !user.passwordHash) {
    throw new CustomerPasswordError("Password change is not available for this account.");
  }

  const match = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!match) {
    throw new CustomerPasswordError("Current password is incorrect.");
  }

  const newHash = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: newHash },
  });
}
