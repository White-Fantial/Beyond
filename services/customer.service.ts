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
import { OrderStatus } from "@prisma/client";
import type {
  CustomerOrderSummary,
  CustomerOrderListResult,
  CustomerOrderDetail,
  CustomerOrderListOptions,
  CustomerSubscriptionSummary,
  CustomerAccountInfo,
  CustomerAddress,
  CustomerAddressInput,
  CustomerNotification,
  CustomerNotificationListResult,
  CustomerNotificationType,
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
      ? {
          status: Array.isArray(status)
            ? { in: status as OrderStatus[] }
            : (status as OrderStatus),
        }
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

  if (nextOrderAt.getTime() < Date.now()) {
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

// ─── Addresses ────────────────────────────────────────────────────────────────

export class CustomerAddressNotFoundError extends Error {
  constructor(id: string) {
    super(`Address not found: ${id}`);
    this.name = "CustomerAddressNotFoundError";
  }
}

export class CustomerAddressValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CustomerAddressValidationError";
  }
}

function toAddress(row: {
  id: string;
  label: string;
  line1: string;
  line2: string | null;
  city: string;
  region: string | null;
  postalCode: string | null;
  country: string;
  isDefault: boolean;
  createdAt: Date;
}): CustomerAddress {
  return {
    id: row.id,
    label: row.label,
    line1: row.line1,
    line2: row.line2,
    city: row.city,
    region: row.region,
    postalCode: row.postalCode,
    country: row.country,
    isDefault: row.isDefault,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function listCustomerAddresses(userId: string): Promise<CustomerAddress[]> {
  const rows = await prisma.customerAddress.findMany({
    where: { userId },
    orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
  });
  return rows.map(toAddress);
}

export async function createCustomerAddress(
  userId: string,
  input: CustomerAddressInput
): Promise<CustomerAddress> {
  if (!input.line1?.trim()) {
    throw new CustomerAddressValidationError("Address line 1 is required.");
  }
  if (!input.city?.trim()) {
    throw new CustomerAddressValidationError("City is required.");
  }

  // If this is the first address, make it default
  const existing = await prisma.customerAddress.count({ where: { userId } });
  const isDefault = existing === 0;

  const row = await prisma.customerAddress.create({
    data: {
      userId,
      label: input.label?.trim() || "Home",
      line1: input.line1.trim(),
      line2: input.line2?.trim() || null,
      city: input.city.trim(),
      region: input.region?.trim() || null,
      postalCode: input.postalCode?.trim() || null,
      country: input.country?.trim() || "NZ",
      isDefault,
    },
  });
  return toAddress(row);
}

export async function updateCustomerAddress(
  userId: string,
  addressId: string,
  input: Partial<CustomerAddressInput>
): Promise<void> {
  const addr = await prisma.customerAddress.findUnique({ where: { id: addressId } });
  if (!addr || addr.userId !== userId) {
    throw new CustomerAddressNotFoundError(addressId);
  }

  await prisma.customerAddress.update({
    where: { id: addressId },
    data: {
      ...(input.label !== undefined ? { label: input.label.trim() || "Home" } : {}),
      ...(input.line1 !== undefined ? { line1: input.line1.trim() } : {}),
      ...(input.line2 !== undefined ? { line2: input.line2?.trim() || null } : {}),
      ...(input.city !== undefined ? { city: input.city.trim() } : {}),
      ...(input.region !== undefined ? { region: input.region?.trim() || null } : {}),
      ...(input.postalCode !== undefined ? { postalCode: input.postalCode?.trim() || null } : {}),
      ...(input.country !== undefined ? { country: input.country.trim() || "NZ" } : {}),
    },
  });
}

export async function deleteCustomerAddress(
  userId: string,
  addressId: string
): Promise<void> {
  const addr = await prisma.customerAddress.findUnique({ where: { id: addressId } });
  if (!addr || addr.userId !== userId) {
    throw new CustomerAddressNotFoundError(addressId);
  }

  await prisma.customerAddress.delete({ where: { id: addressId } });

  // If the deleted address was default and others remain, promote the oldest
  if (addr.isDefault) {
    const next = await prisma.customerAddress.findFirst({
      where: { userId },
      orderBy: { createdAt: "asc" },
    });
    if (next) {
      await prisma.customerAddress.update({
        where: { id: next.id },
        data: { isDefault: true },
      });
    }
  }
}

export async function setDefaultCustomerAddress(
  userId: string,
  addressId: string
): Promise<void> {
  const addr = await prisma.customerAddress.findUnique({ where: { id: addressId } });
  if (!addr || addr.userId !== userId) {
    throw new CustomerAddressNotFoundError(addressId);
  }

  await prisma.$transaction([
    prisma.customerAddress.updateMany({
      where: { userId, isDefault: true },
      data: { isDefault: false },
    }),
    prisma.customerAddress.update({
      where: { id: addressId },
      data: { isDefault: true },
    }),
  ]);
}

// ─── Notifications ────────────────────────────────────────────────────────────

export class CustomerNotificationNotFoundError extends Error {
  constructor(id: string) {
    super(`Notification not found: ${id}`);
    this.name = "CustomerNotificationNotFoundError";
  }
}

function toCustomerNotification(row: {
  id: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  entityType: string | null;
  entityId: string | null;
  readAt: Date | null;
  createdAt: Date;
}): CustomerNotification {
  return {
    id: row.id,
    userId: row.userId,
    type: row.type as CustomerNotificationType,
    title: row.title,
    body: row.body,
    entityType: row.entityType,
    entityId: row.entityId,
    readAt: row.readAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function listCustomerNotifications(
  userId: string,
  opts: { unreadOnly?: boolean; page?: number; pageSize?: number } = {}
): Promise<CustomerNotificationListResult> {
  const { unreadOnly = false, page = 1, pageSize = 50 } = opts;

  const where = {
    userId,
    ...(unreadOnly ? { readAt: null } : {}),
  };

  const [rows, total, unreadCount] = await Promise.all([
    prisma.customerNotification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.customerNotification.count({ where }),
    prisma.customerNotification.count({ where: { userId, readAt: null } }),
  ]);

  return {
    items: rows.map(toCustomerNotification),
    total,
    unreadCount,
    page,
    pageSize,
  };
}

export async function getCustomerUnreadNotificationCount(userId: string): Promise<number> {
  return prisma.customerNotification.count({ where: { userId, readAt: null } });
}

export async function markCustomerNotificationRead(
  userId: string,
  notificationId: string
): Promise<void> {
  const notif = await prisma.customerNotification.findUnique({ where: { id: notificationId } });
  if (!notif || notif.userId !== userId) {
    throw new CustomerNotificationNotFoundError(notificationId);
  }
  if (notif.readAt) return;
  await prisma.customerNotification.update({
    where: { id: notificationId },
    data: { readAt: new Date() },
  });
}

export async function markAllCustomerNotificationsRead(userId: string): Promise<void> {
  await prisma.customerNotification.updateMany({
    where: { userId, readAt: null },
    data: { readAt: new Date() },
  });
}

export async function createCustomerNotification(
  userId: string,
  data: {
    type: CustomerNotificationType;
    title: string;
    body: string;
    entityType?: string | null;
    entityId?: string | null;
  }
): Promise<CustomerNotification> {
  const row = await prisma.customerNotification.create({
    data: {
      userId,
      type: data.type,
      title: data.title,
      body: data.body,
      entityType: data.entityType ?? null,
      entityId: data.entityId ?? null,
    },
  });
  return toCustomerNotification(row);
}
