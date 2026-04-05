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
import { stripeBillingAdapter } from "@/adapters/billing/stripe.adapter";
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
import type {
  LoyaltyAccount,
  LoyaltyTransaction,
  LoyaltyTransactionListResult,
  LoyaltySummary,
  LoyaltyTier,
  LoyaltyTransactionType,
  LoyaltyTransactionListOptions,
  ReferralCode,
} from "@/types/customer-loyalty";
import type {
  SavedPaymentMethod,
  AddPaymentMethodInput,
} from "@/types/customer-payment-methods";
import type { ReferralStats, PushPreferences } from "@/types/customer-referrals";

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

// ─── Phase 3: Loyalty & Payment Methods ──────────────────────────────────────

// ─── Errors ───────────────────────────────────────────────────────────────────

export class LoyaltyAccountNotFoundError extends Error {
  constructor(userId: string) {
    super(`Loyalty account not found for user: ${userId}`);
    this.name = "LoyaltyAccountNotFoundError";
  }
}

export class LoyaltyInsufficientPointsError extends Error {
  constructor(available: number, requested: number) {
    super(`Insufficient loyalty points: have ${available}, requested ${requested}`);
    this.name = "LoyaltyInsufficientPointsError";
  }
}

export class SavedPaymentMethodNotFoundError extends Error {
  constructor(id: string) {
    super(`Saved payment method not found: ${id}`);
    this.name = "SavedPaymentMethodNotFoundError";
  }
}

// ─── Tier configuration ───────────────────────────────────────────────────────

const TIER_THRESHOLDS: Array<{ tier: LoyaltyTier; minPoints: number; label: string }> = [
  { tier: "BRONZE", minPoints: 0, label: "Bronze" },
  { tier: "SILVER", minPoints: 500, label: "Silver" },
  { tier: "GOLD", minPoints: 1500, label: "Gold" },
  { tier: "PLATINUM", minPoints: 5000, label: "Platinum" },
];

function computeTier(points: number): LoyaltyTier {
  let tier: LoyaltyTier = "BRONZE";
  for (const t of TIER_THRESHOLDS) {
    if (points >= t.minPoints) tier = t.tier;
  }
  return tier;
}

function getNextTierThreshold(
  currentTier: LoyaltyTier
): { tier: LoyaltyTier; minPoints: number; label: string } | null {
  const idx = TIER_THRESHOLDS.findIndex((t) => t.tier === currentTier);
  return TIER_THRESHOLDS[idx + 1] ?? null;
}

// ─── Mappers ──────────────────────────────────────────────────────────────────

function toLoyaltyAccount(row: {
  id: string;
  userId: string;
  points: number;
  tier: string;
  createdAt: Date;
  updatedAt: Date;
}): LoyaltyAccount {
  return {
    id: row.id,
    userId: row.userId,
    points: row.points,
    tier: row.tier as LoyaltyTier,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toLoyaltyTransaction(row: {
  id: string;
  accountId: string;
  orderId: string | null;
  type: string;
  pointsDelta: number;
  description: string | null;
  createdAt: Date;
}): LoyaltyTransaction {
  return {
    id: row.id,
    accountId: row.accountId,
    orderId: row.orderId,
    type: row.type as LoyaltyTransactionType,
    pointsDelta: row.pointsDelta,
    description: row.description,
    createdAt: row.createdAt.toISOString(),
  };
}

function toReferralCode(row: {
  id: string;
  userId: string;
  code: string;
  usedCount: number;
  rewardPoints: number;
  createdAt: Date;
}): ReferralCode {
  return {
    id: row.id,
    userId: row.userId,
    code: row.code,
    usedCount: row.usedCount,
    rewardPoints: row.rewardPoints,
    createdAt: row.createdAt.toISOString(),
  };
}

function toSavedPaymentMethod(row: {
  id: string;
  userId: string;
  provider: string;
  last4: string;
  brand: string;
  expiryMonth: number;
  expiryYear: number;
  isDefault: boolean;
  providerMethodId: string;
  createdAt: Date;
}): SavedPaymentMethod {
  return {
    id: row.id,
    userId: row.userId,
    provider: row.provider,
    last4: row.last4,
    brand: row.brand,
    expiryMonth: row.expiryMonth,
    expiryYear: row.expiryYear,
    isDefault: row.isDefault,
    providerMethodId: row.providerMethodId,
    createdAt: row.createdAt.toISOString(),
  };
}

// ─── Loyalty Service Functions ────────────────────────────────────────────────

/**
 * Returns the loyalty account for the user, creating it if it doesn't exist yet.
 * Also computes tier and next-tier threshold.
 */
export async function getLoyaltyAccount(userId: string): Promise<LoyaltySummary> {
  let account = await prisma.loyaltyAccount.findUnique({ where: { userId } });

  if (!account) {
    account = await prisma.loyaltyAccount.create({
      data: { userId, points: 0, tier: "BRONZE" },
    });
  }

  const tier = computeTier(account.points);
  if (tier !== account.tier) {
    account = await prisma.loyaltyAccount.update({
      where: { id: account.id },
      data: { tier },
    });
  }

  const nextTier = getNextTierThreshold(account.tier as LoyaltyTier);
  const referral = await prisma.referralCode.findFirst({ where: { userId } });

  return {
    account: toLoyaltyAccount(account),
    nextTier,
    pointsToNextTier: nextTier ? nextTier.minPoints - account.points : null,
    referralCode: referral?.code ?? null,
  };
}

/**
 * Returns a paginated list of loyalty transactions for the user.
 */
export async function getLoyaltyTransactions(
  userId: string,
  opts: LoyaltyTransactionListOptions = {}
): Promise<LoyaltyTransactionListResult> {
  const { type, page = 1, pageSize = 20 } = opts;

  const account = await prisma.loyaltyAccount.findUnique({ where: { userId } });
  if (!account) {
    return { items: [], total: 0, page, pageSize };
  }

  const where = {
    accountId: account.id,
    ...(type ? { type } : {}),
  };

  const [rows, total] = await Promise.all([
    prisma.loyaltyTransaction.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.loyaltyTransaction.count({ where }),
  ]);

  return {
    items: rows.map(toLoyaltyTransaction),
    total,
    page,
    pageSize,
  };
}

/**
 * Redeems loyalty points for a user, creating a REDEEM transaction.
 * Validates that the user has sufficient points and orderId is provided.
 */
export async function redeemLoyaltyPoints(
  userId: string,
  orderId: string,
  points: number
): Promise<LoyaltyAccount> {
  if (points <= 0) {
    throw new LoyaltyInsufficientPointsError(0, points);
  }

  const account = await prisma.loyaltyAccount.findUnique({ where: { userId } });
  if (!account) {
    throw new LoyaltyAccountNotFoundError(userId);
  }
  if (account.points < points) {
    throw new LoyaltyInsufficientPointsError(account.points, points);
  }

  const newPoints = account.points - points;
  const newTier = computeTier(newPoints);

  const [updated] = await prisma.$transaction([
    prisma.loyaltyAccount.update({
      where: { id: account.id },
      data: { points: newPoints, tier: newTier },
    }),
    prisma.loyaltyTransaction.create({
      data: {
        accountId: account.id,
        orderId,
        type: "REDEEM",
        pointsDelta: -points,
        description: `Redeemed ${points} points for order ${orderId}`,
      },
    }),
  ]);

  await logAuditEvent({
    action: "LOYALTY_REDEEM",
    targetType: "LoyaltyAccount",
    targetId: account.id,
    actorUserId: userId,
    metadata: { orderId, points, newBalance: newPoints },
  });

  return toLoyaltyAccount(updated);
}

/**
 * Returns the referral code for the user, creating a unique one if it doesn't exist.
 */
export async function getReferralCode(userId: string): Promise<ReferralCode> {
  const account = await getLoyaltyAccount(userId);

  const existing = await prisma.referralCode.findFirst({
    where: { userId },
  });
  if (existing) {
    return toReferralCode(existing);
  }

  // Generate a unique code: 8-char alphanumeric
  let code: string;
  let attempts = 0;
  do {
    code = Math.random().toString(36).substring(2, 10).toUpperCase();
    const conflict = await prisma.referralCode.findUnique({ where: { code } });
    if (!conflict) break;
    attempts++;
  } while (attempts < 10);

  const created = await prisma.referralCode.create({
    data: {
      userId,
      accountId: account.account.id,
      code: code!,
      rewardPoints: 100,
    },
  });

  return toReferralCode(created);
}

// ─── Payment Method Service Functions ────────────────────────────────────────

/**
 * Returns all saved payment methods for the user.
 */
export async function listSavedPaymentMethods(userId: string): Promise<SavedPaymentMethod[]> {
  const rows = await prisma.savedPaymentMethod.findMany({
    where: { userId },
    orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
  });
  return rows.map(toSavedPaymentMethod);
}

/**
 * Saves a new payment method reference for the user.
 * The providerMethodId should already exist in Stripe (e.g., from a SetupIntent).
 */
export async function addSavedPaymentMethod(
  userId: string,
  input: AddPaymentMethodInput
): Promise<SavedPaymentMethod> {
  const existingCount = await prisma.savedPaymentMethod.count({ where: { userId } });

  const row = await prisma.savedPaymentMethod.create({
    data: {
      userId,
      provider: "STRIPE",
      last4: input.last4,
      brand: input.brand,
      expiryMonth: input.expiryMonth,
      expiryYear: input.expiryYear,
      isDefault: existingCount === 0,
      providerMethodId: input.providerMethodId,
    },
  });

  await logAuditEvent({
    action: "PAYMENT_METHOD_ADD",
    targetType: "SavedPaymentMethod",
    targetId: row.id,
    actorUserId: userId,
    metadata: { last4: input.last4, brand: input.brand },
  });

  return toSavedPaymentMethod(row);
}

/**
 * Removes a saved payment method. Detaches from Stripe then deletes the record.
 */
export async function removeSavedPaymentMethod(
  userId: string,
  methodId: string
): Promise<void> {
  const method = await prisma.savedPaymentMethod.findUnique({ where: { id: methodId } });
  if (!method || method.userId !== userId) {
    throw new SavedPaymentMethodNotFoundError(methodId);
  }

  await stripeBillingAdapter.detachPaymentMethod(method.providerMethodId);

  await prisma.savedPaymentMethod.delete({ where: { id: methodId } });

  // If removed method was default, promote the most recently added method
  if (method.isDefault) {
    const next = await prisma.savedPaymentMethod.findFirst({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
    if (next) {
      await prisma.savedPaymentMethod.update({
        where: { id: next.id },
        data: { isDefault: true },
      });
    }
  }

  await logAuditEvent({
    action: "PAYMENT_METHOD_REMOVE",
    targetType: "SavedPaymentMethod",
    targetId: methodId,
    actorUserId: userId,
    metadata: { last4: method.last4 },
  });
}

/**
 * Sets the specified payment method as the default for the user.
 */
export async function setDefaultPaymentMethod(
  userId: string,
  methodId: string
): Promise<SavedPaymentMethod> {
  const method = await prisma.savedPaymentMethod.findUnique({ where: { id: methodId } });
  if (!method || method.userId !== userId) {
    throw new SavedPaymentMethodNotFoundError(methodId);
  }

  await prisma.$transaction([
    prisma.savedPaymentMethod.updateMany({
      where: { userId, isDefault: true },
      data: { isDefault: false },
    }),
    prisma.savedPaymentMethod.update({
      where: { id: methodId },
      data: { isDefault: true },
    }),
  ]);

  const updated = await prisma.savedPaymentMethod.findUniqueOrThrow({ where: { id: methodId } });
  return toSavedPaymentMethod(updated);
}

// ─── Referral Stats ───────────────────────────────────────────────────────────

export async function getReferralStats(userId: string): Promise<ReferralStats> {
  const code = await getReferralCode(userId);

  const referralTransactions = await prisma.loyaltyTransaction.findMany({
    where: {
      account: { userId },
      description: { contains: "referral", mode: "insensitive" },
    },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  const pointsEarned = referralTransactions
    .filter((t) => t.pointsDelta > 0)
    .reduce((sum, t) => sum + t.pointsDelta, 0);

  return {
    code,
    totalReferrals: code.usedCount,
    pointsEarned,
    referralHistory: referralTransactions.map((t) => ({
      id: t.id,
      pointsDelta: t.pointsDelta,
      description: t.description,
      createdAt: t.createdAt.toISOString(),
    })),
  };
}

// ─── Push Preferences ─────────────────────────────────────────────────────────

export async function getUserPushPreferences(userId: string): Promise<PushPreferences> {
  const pref = await prisma.pushPreference.findUnique({ where: { userId } });
  if (!pref) return { orders: true, promotions: true, loyalty: true };
  return { orders: pref.orders, promotions: pref.promotions, loyalty: pref.loyalty };
}

export async function updatePushPreferences(
  userId: string,
  prefs: Partial<PushPreferences>
): Promise<PushPreferences> {
  const row = await prisma.pushPreference.upsert({
    where: { userId },
    create: {
      userId,
      orders: prefs.orders ?? true,
      promotions: prefs.promotions ?? true,
      loyalty: prefs.loyalty ?? true,
    },
    update: {
      ...(prefs.orders !== undefined ? { orders: prefs.orders } : {}),
      ...(prefs.promotions !== undefined ? { promotions: prefs.promotions } : {}),
      ...(prefs.loyalty !== undefined ? { loyalty: prefs.loyalty } : {}),
    },
  });
  return { orders: row.orders, promotions: row.promotions, loyalty: row.loyalty };
}
