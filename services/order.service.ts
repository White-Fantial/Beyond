/**
 * Order service — canonical multi-channel order management.
 *
 * Design principles:
 * - One real customer purchase = one Order record in the DB.
 * - source_channel tracks where the order originated.
 * - OrderChannelLink records track each channel connection (source, forwarded, mirror).
 * - POS webhook/sync reconciliation is idempotent: find-or-create, never duplicate.
 * - All external payloads are stored raw for audit/replay.
 * - Money is always integer minor units (never float).
 */

import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import type {
  Order,
  OrderItem,
  OrderItemModifier,
  OrderChannelLink,
  OrderEvent,
  InboundWebhookLog,
  OrderSourceChannel,
  OrderChannelType,
  OrderChannelRole,
  OrderLinkDirection,
  OrderStatus,
  PosSubmissionStatus,
  OrderEventType,
} from "@prisma/client";

// ─── Errors ───────────────────────────────────────────────────────────────────

export class DuplicateOrderError extends Error {
  constructor(public readonly existingOrderId: string) {
    super(`An order with this canonical key already exists: ${existingOrderId}`);
    this.name = "DuplicateOrderError";
  }
}

export class OrderNotFoundError extends Error {
  constructor(id: string) {
    super(`Order not found: ${id}`);
    this.name = "OrderNotFoundError";
  }
}

// ─── Input types ──────────────────────────────────────────────────────────────

export interface NormalizedOrderItem {
  productId?: string;
  productName: string;
  productSku?: string;
  sourceProductRef?: string;
  quantity: number;
  unitPriceAmount: number;
  totalPriceAmount: number;
  notes?: string;
  rawPayload?: object;
  modifiers?: NormalizedOrderItemModifier[];
}

export interface NormalizedOrderItemModifier {
  modifierGroupId?: string;
  modifierOptionId?: string;
  modifierGroupName?: string;
  modifierOptionName: string;
  quantity?: number;
  unitPriceAmount?: number;
  totalPriceAmount?: number;
  sourceModifierGroupRef?: string;
  sourceModifierOptionRef?: string;
  rawPayload?: object;
}

export interface CreateCanonicalOrderInput {
  tenantId: string;
  storeId: string;
  channelType: OrderChannelType;
  connectionId?: string;
  externalOrderRef?: string;
  sourceCustomerRef?: string;
  originSubmittedAt?: Date;
  orderedAt: Date;
  subtotalAmount?: number;
  discountAmount?: number;
  taxAmount?: number;
  tipAmount?: number;
  totalAmount: number;
  currencyCode?: string;
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  notes?: string;
  items?: NormalizedOrderItem[];
  /** Raw payload from the originating channel. */
  rawPayload: object;
  /** Whether this order should be forwarded to POS for docket printing. */
  posForwardingRequired?: boolean;
  posConnectionId?: string;
}

export interface ForwardOrderToPosInput {
  orderId: string;
  posConnectionId: string;
  requestPayload?: object;
}

export interface RecordPosForwardResponseInput {
  orderId: string;
  posConnectionId: string;
  success: boolean;
  posOrderRef?: string;
  responsePayload?: object;
  errorMessage?: string;
}

export interface ReconcilePosEventInput {
  tenantId: string;
  storeId: string;
  connectionId: string;
  externalOrderRef: string;
  externalStatus?: string;
  rawPayload: object;
  deliveryId?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Map OrderChannelType to OrderSourceChannel for the canonical order. */
function channelTypeToSourceChannel(
  channelType: OrderChannelType
): OrderSourceChannel {
  const map: Record<OrderChannelType, OrderSourceChannel> = {
    POS: "POS",
    UBER_EATS: "UBER_EATS",
    DOORDASH: "DOORDASH",
    ONLINE: "ONLINE",
    SUBSCRIPTION: "SUBSCRIPTION",
  };
  return map[channelType];
}

/**
 * Build the canonical idempotency key for deduplication.
 * Format: "<channelType>:<storeId>:<externalOrderRef>"
 */
function buildCanonicalOrderKey(
  channelType: OrderChannelType,
  storeId: string,
  externalOrderRef: string
): string {
  return `${channelType}:${storeId}:${externalOrderRef}`;
}

/** Emit an OrderEvent within an ongoing $transaction or standalone. */
async function emitOrderEvent(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  params: {
    orderId: string;
    tenantId: string;
    storeId: string;
    eventType: OrderEventType;
    channelType?: OrderChannelType;
    connectionId?: string;
    message?: string;
    payload?: object;
  }
): Promise<void> {
  await tx.orderEvent.create({
    data: {
      orderId: params.orderId,
      tenantId: params.tenantId,
      storeId: params.storeId,
      eventType: params.eventType,
      channelType: params.channelType ?? null,
      connectionId: params.connectionId ?? null,
      message: params.message ?? null,
      payload: params.payload ?? undefined,
    },
  });
}

// ─── Core service functions ───────────────────────────────────────────────────

/**
 * Create a canonical order from an inbound external order event.
 *
 * Idempotent: if a canonical order with the same key already exists, returns the
 * existing order rather than creating a duplicate.
 *
 * @returns { order, created } — created=false means a duplicate was found and returned.
 */
export async function createCanonicalOrderFromInbound(
  input: CreateCanonicalOrderInput
): Promise<{ order: Order; created: boolean }> {
  const {
    tenantId,
    storeId,
    channelType,
    connectionId,
    externalOrderRef,
    rawPayload,
  } = input;

  const sourceChannel = channelTypeToSourceChannel(channelType);

  // Build canonicalOrderKey when we have an external ref to deduplicate against.
  const canonicalOrderKey =
    externalOrderRef
      ? buildCanonicalOrderKey(channelType, storeId, externalOrderRef)
      : null;

  // ── Idempotency check ────────────────────────────────────────────────────
  if (canonicalOrderKey) {
    const existing = await prisma.order.findFirst({
      where: { tenantId, storeId, canonicalOrderKey },
    });
    if (existing) {
      return { order: existing, created: false };
    }
  }

  // ── Create the canonical order inside a transaction ───────────────────────
  const order = await prisma.$transaction(async (tx) => {
    const created = await tx.order.create({
      data: {
        tenantId,
        storeId,
        sourceChannel,
        sourceConnectionId: connectionId ?? null,
        sourceOrderRef: externalOrderRef ?? null,
        sourceCustomerRef: input.sourceCustomerRef ?? null,
        originSubmittedAt: input.originSubmittedAt ?? null,
        orderedAt: input.orderedAt,
        status: "RECEIVED",
        subtotalAmount: input.subtotalAmount ?? 0,
        discountAmount: input.discountAmount ?? 0,
        taxAmount: input.taxAmount ?? 0,
        tipAmount: input.tipAmount ?? 0,
        totalAmount: input.totalAmount,
        currencyCode: input.currencyCode ?? "NZD",
        customerId: input.customerId ?? null,
        customerName: input.customerName ?? null,
        customerPhone: input.customerPhone ?? null,
        customerEmail: input.customerEmail ?? null,
        posForwardingRequired: input.posForwardingRequired ?? false,
        posConnectionId: input.posConnectionId ?? null,
        posSubmissionStatus: input.posForwardingRequired ? "PENDING" : "NOT_REQUIRED",
        canonicalOrderKey,
        notes: input.notes ?? null,
        rawSourcePayload: rawPayload,
      },
    });

    // ── Create order items ─────────────────────────────────────────────────
    if (input.items?.length) {
      for (const item of input.items) {
        const createdItem = await tx.orderItem.create({
          data: {
            orderId: created.id,
            tenantId,
            storeId,
            productId: item.productId ?? null,
            productName: item.productName,
            productSku: item.productSku ?? null,
            sourceProductRef: item.sourceProductRef ?? null,
            quantity: item.quantity,
            unitPriceAmount: item.unitPriceAmount,
            totalPriceAmount: item.totalPriceAmount,
            notes: item.notes ?? null,
            rawPayload: item.rawPayload ?? undefined,
          },
        });

        if (item.modifiers?.length) {
          await tx.orderItemModifier.createMany({
            data: item.modifiers.map((mod) => ({
              orderItemId: createdItem.id,
              tenantId,
              storeId,
              modifierGroupId: mod.modifierGroupId ?? null,
              modifierOptionId: mod.modifierOptionId ?? null,
              modifierGroupName: mod.modifierGroupName ?? null,
              modifierOptionName: mod.modifierOptionName,
              quantity: mod.quantity ?? 1,
              unitPriceAmount: mod.unitPriceAmount ?? 0,
              totalPriceAmount: mod.totalPriceAmount ?? 0,
              sourceModifierGroupRef: mod.sourceModifierGroupRef ?? null,
              sourceModifierOptionRef: mod.sourceModifierOptionRef ?? null,
              rawPayload: mod.rawPayload ?? undefined,
            })),
          });
        }
      }
    }

    // ── Create SOURCE channel link ─────────────────────────────────────────
    if (externalOrderRef) {
      await tx.orderChannelLink.create({
        data: {
          orderId: created.id,
          tenantId,
          storeId,
          channelType,
          connectionId: connectionId ?? null,
          role: "SOURCE",
          direction: "INBOUND",
          externalOrderRef,
          createdByBeyond: false,
          linkedBy: "webhook",
          rawPayload,
        },
      });
    }

    // ── Emit ORDER_RECEIVED event ──────────────────────────────────────────
    await emitOrderEvent(tx, {
      orderId: created.id,
      tenantId,
      storeId,
      eventType: "ORDER_RECEIVED",
      channelType,
      connectionId,
      message: `Order received from ${channelType}`,
      payload: { externalOrderRef, canonicalOrderKey },
    });

    return created;
  });

  return { order, created: true };
}

/**
 * Mark an order as pending POS submission and emit the POS_FORWARD_REQUESTED event.
 */
export async function forwardOrderToPos(
  input: ForwardOrderToPosInput
): Promise<Order> {
  const { orderId, posConnectionId, requestPayload } = input;

  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) throw new OrderNotFoundError(orderId);

  const updated = await prisma.$transaction(async (tx) => {
    const upd = await tx.order.update({
      where: { id: orderId },
      data: {
        posForwardingRequired: true,
        posConnectionId,
        posSubmissionStatus: "PENDING",
        posSubmittedAt: new Date(),
      },
    });

    // Create OUTBOUND / FORWARDED channel link for POS
    await tx.orderChannelLink.create({
      data: {
        orderId,
        tenantId: order.tenantId,
        storeId: order.storeId,
        channelType: "POS",
        connectionId: posConnectionId,
        role: "FORWARDED",
        direction: "OUTBOUND",
        createdByBeyond: true,
        linkedBy: "forward-response",
        requestPayload: requestPayload ?? undefined,
      },
    });

    await emitOrderEvent(tx, {
      orderId,
      tenantId: order.tenantId,
      storeId: order.storeId,
      eventType: "POS_FORWARD_REQUESTED",
      channelType: "POS",
      connectionId: posConnectionId,
      message: "Order forwarded to POS for docket printing",
    });

    return upd;
  });

  return updated;
}

/**
 * Record the POS system's response to a forwarded order.
 * Updates posOrderRef, posAcceptedAt, and posSubmissionStatus.
 */
export async function recordPosForwardResponse(
  input: RecordPosForwardResponseInput
): Promise<Order> {
  const { orderId, posConnectionId, success, posOrderRef, responsePayload, errorMessage } = input;

  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) throw new OrderNotFoundError(orderId);

  const submissionStatus: PosSubmissionStatus = success ? "ACCEPTED" : "FAILED";
  const eventType: OrderEventType = success ? "POS_FORWARD_ACCEPTED" : "POS_FORWARD_FAILED";

  const updated = await prisma.$transaction(async (tx) => {
    const upd = await tx.order.update({
      where: { id: orderId },
      data: {
        posSubmissionStatus: submissionStatus,
        posOrderRef: posOrderRef ?? null,
        posAcceptedAt: success ? new Date() : null,
      },
    });

    // Update the FORWARDED channel link with the response
    await tx.orderChannelLink.updateMany({
      where: {
        orderId,
        channelType: "POS",
        connectionId: posConnectionId,
        role: "FORWARDED",
        direction: "OUTBOUND",
      },
      data: {
        externalOrderRef: posOrderRef ?? null,
        externalStatus: success ? "ACCEPTED" : "FAILED",
        responsePayload: responsePayload ?? undefined,
        externalUpdatedAt: new Date(),
      },
    });

    await emitOrderEvent(tx, {
      orderId,
      tenantId: order.tenantId,
      storeId: order.storeId,
      eventType,
      channelType: "POS",
      connectionId: posConnectionId,
      message: success
        ? `POS accepted the order (posOrderRef=${posOrderRef})`
        : `POS rejected the order: ${errorMessage}`,
      payload: { posOrderRef, success, errorMessage },
    });

    return upd;
  });

  return updated;
}

/**
 * Reconcile an inbound POS webhook/sync event against the canonical order store.
 *
 * Lookup order:
 *   1. Find an OUTBOUND/FORWARDED OrderChannelLink for this connection + externalOrderRef.
 *      → If found, this is a POS echo of an order Beyond already sent. Update existing order.
 *   2. Find an existing Order by posConnectionId + posOrderRef.
 *      → Fallback lookup for direct posOrderRef match.
 *   3. If neither is found, create a new POS-origin canonical order.
 *
 * @returns { order, action } — action: "updated" | "created"
 */
export async function reconcilePosWebhookOrSync(
  input: ReconcilePosEventInput
): Promise<{ order: Order; action: "updated" | "created" }> {
  const { tenantId, storeId, connectionId, externalOrderRef, externalStatus, rawPayload, deliveryId } = input;

  // ── Step 1: check for an existing FORWARDED link ──────────────────────────
  const forwardedLink = await prisma.orderChannelLink.findFirst({
    where: {
      tenantId,
      storeId,
      channelType: "POS",
      connectionId,
      externalOrderRef,
      role: "FORWARDED",
      direction: "OUTBOUND",
    },
  });

  if (forwardedLink) {
    // This is the POS echoing back an order that Beyond sent to it.
    // Update the existing canonical order — do NOT create a new one.
    const updated = await prisma.$transaction(async (tx) => {
      await tx.orderChannelLink.update({
        where: { id: forwardedLink.id },
        data: {
          externalStatus: externalStatus ?? null,
          externalUpdatedAt: new Date(),
          rawPayload,
          linkedBy: "sync",
        },
      });

      // Upsert a MIRROR link for reconciliation tracking
      await tx.orderChannelLink.upsert({
        where: {
          // Use a composite stable key via create/update pattern
          id: `${forwardedLink.orderId}-POS-MIRROR-${connectionId}`,
        },
        create: {
          id: `${forwardedLink.orderId}-POS-MIRROR-${connectionId}`,
          orderId: forwardedLink.orderId,
          tenantId,
          storeId,
          channelType: "POS",
          connectionId,
          role: "MIRROR",
          direction: "INBOUND",
          externalOrderRef,
          externalStatus: externalStatus ?? null,
          rawPayload,
          linkedBy: "sync",
          createdByBeyond: false,
        },
        update: {
          externalStatus: externalStatus ?? null,
          externalUpdatedAt: new Date(),
          rawPayload,
        },
      });

      const order = await tx.order.findUnique({
        where: { id: forwardedLink.orderId },
      });
      if (!order) throw new OrderNotFoundError(forwardedLink.orderId);

      await emitOrderEvent(tx, {
        orderId: forwardedLink.orderId,
        tenantId,
        storeId,
        eventType: "POS_RECONCILED",
        channelType: "POS",
        connectionId,
        message: "POS sync reconciled with existing Beyond-forwarded order",
        payload: { externalOrderRef, externalStatus, deliveryId },
      });

      return order;
    });

    return { order: updated, action: "updated" };
  }

  // ── Step 2: check by posConnectionId + posOrderRef ───────────────────────
  const byPosRef = await prisma.order.findFirst({
    where: { tenantId, storeId, posConnectionId: connectionId, posOrderRef: externalOrderRef },
  });

  if (byPosRef) {
    // Update status from POS
    const updated = await prisma.$transaction(async (tx) => {
      const upd = await tx.order.update({
        where: { id: byPosRef.id },
        data: {
          posSubmissionStatus: "ACCEPTED",
          posAcceptedAt: byPosRef.posAcceptedAt ?? new Date(),
        },
      });

      await emitOrderEvent(tx, {
        orderId: byPosRef.id,
        tenantId,
        storeId,
        eventType: "POS_RECONCILED",
        channelType: "POS",
        connectionId,
        message: "POS sync matched existing order via posOrderRef",
        payload: { externalOrderRef, externalStatus, deliveryId },
      });

      return upd;
    });

    return { order: updated, action: "updated" };
  }

  // ── Step 3: brand-new POS-origin order ───────────────────────────────────
  const canonicalOrderKey = buildCanonicalOrderKey("POS", storeId, externalOrderRef);

  // Double-check idempotency before creating
  const existingByKey = await prisma.order.findFirst({
    where: { tenantId, storeId, canonicalOrderKey },
  });
  if (existingByKey) {
    return { order: existingByKey, action: "updated" };
  }

  const newOrder = await prisma.$transaction(async (tx) => {
    const created = await tx.order.create({
      data: {
        tenantId,
        storeId,
        sourceChannel: "POS",
        sourceConnectionId: connectionId,
        sourceOrderRef: externalOrderRef,
        orderedAt: new Date(),
        status: "RECEIVED",
        totalAmount: 0,
        currencyCode: "NZD",
        posForwardingRequired: false,
        posSubmissionStatus: "NOT_REQUIRED",
        posConnectionId: connectionId,
        posOrderRef: externalOrderRef,
        canonicalOrderKey,
        rawSourcePayload: rawPayload,
      },
    });

    await tx.orderChannelLink.create({
      data: {
        orderId: created.id,
        tenantId,
        storeId,
        channelType: "POS",
        connectionId,
        role: "SOURCE",
        direction: "INBOUND",
        externalOrderRef,
        externalStatus: externalStatus ?? null,
        rawPayload,
        linkedBy: "webhook",
        createdByBeyond: false,
      },
    });

    await emitOrderEvent(tx, {
      orderId: created.id,
      tenantId,
      storeId,
      eventType: "ORDER_RECEIVED",
      channelType: "POS",
      connectionId,
      message: "New POS-origin order created from webhook/sync",
      payload: { externalOrderRef, externalStatus, deliveryId, canonicalOrderKey },
    });

    return created;
  });

  return { order: newOrder, action: "created" };
}

/**
 * Log a raw inbound webhook call before any processing.
 * Call this at the very start of webhook handlers for audit/replay.
 */
export async function logInboundWebhook(params: {
  tenantId?: string;
  storeId?: string;
  connectionId?: string;
  channelType?: OrderChannelType;
  eventName?: string;
  externalEventRef?: string;
  deliveryId?: string;
  signatureValid?: boolean;
  processingStatus: string;
  requestHeaders?: object;
  requestBody?: object;
}): Promise<InboundWebhookLog> {
  return prisma.inboundWebhookLog.create({
    data: {
      tenantId: params.tenantId ?? null,
      storeId: params.storeId ?? null,
      connectionId: params.connectionId ?? null,
      channelType: params.channelType ?? null,
      eventName: params.eventName ?? null,
      externalEventRef: params.externalEventRef ?? null,
      deliveryId: params.deliveryId ?? null,
      signatureValid: params.signatureValid ?? null,
      processingStatus: params.processingStatus,
      requestHeaders: params.requestHeaders ?? undefined,
      requestBody: params.requestBody ?? undefined,
    },
  });
}

/**
 * Mark a webhook log as processed (or failed) after handling.
 */
export async function markWebhookLogProcessed(
  logId: string,
  status: string,
  errorMessage?: string
): Promise<void> {
  await prisma.inboundWebhookLog.update({
    where: { id: logId },
    data: {
      processingStatus: status,
      processedAt: new Date(),
      errorMessage: errorMessage ?? null,
    },
  });
}

// ─── Query functions ──────────────────────────────────────────────────────────

export interface ListOrdersOptions {
  limit?: number;
  offset?: number;
  status?: OrderStatus | OrderStatus[];
  sourceChannel?: OrderSourceChannel | OrderSourceChannel[];
  /** Inclusive lower bound (orderedAt). */
  from?: Date;
  /** Inclusive upper bound (orderedAt). */
  to?: Date;
}

export interface ListOrdersResult {
  orders: (Order & { items: OrderItem[] })[];
  total: number;
}

/**
 * List canonical orders for a store, newest first.
 * Includes order items. Does not include modifiers (use a separate query if needed).
 */
export async function listOrders(
  storeId: string,
  opts: ListOrdersOptions = {}
): Promise<ListOrdersResult> {
  const { limit = 50, offset = 0, status, sourceChannel, from, to } = opts;

  const where: Prisma.OrderWhereInput = {
    storeId,
    ...(status
      ? { status: Array.isArray(status) ? { in: status } : status }
      : {}),
    ...(sourceChannel
      ? {
          sourceChannel: Array.isArray(sourceChannel)
            ? { in: sourceChannel }
            : sourceChannel,
        }
      : {}),
    ...(from || to
      ? {
          orderedAt: {
            ...(from ? { gte: from } : {}),
            ...(to ? { lte: to } : {}),
          },
        }
      : {}),
  };

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      orderBy: { orderedAt: "desc" },
      take: limit,
      skip: offset,
      include: { items: true },
    }),
    prisma.order.count({ where }),
  ]);

  return { orders, total };
}

/**
 * Fetch a single canonical order by ID, including items and channel links.
 */
export async function getOrderById(
  orderId: string
): Promise<(Order & { items: OrderItem[]; channelLinks: OrderChannelLink[] }) | null> {
  return prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true, channelLinks: true },
  });
}

/**
 * Update the status of a canonical order.
 */
export async function updateOrderStatus(
  orderId: string,
  status: OrderStatus,
  opts?: { cancelledAt?: Date }
): Promise<Order> {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) throw new OrderNotFoundError(orderId);

  const data: Parameters<typeof prisma.order.update>[0]["data"] = {
    status,
    ...(status === "COMPLETED" ? { completedAt: new Date() } : {}),
    ...(status === "ACCEPTED" ? { acceptedAt: new Date() } : {}),
    ...(status === "CANCELLED" ? { cancelledAt: opts?.cancelledAt ?? new Date() } : {}),
  };

  const updated = await prisma.$transaction(async (tx) => {
    const upd = await tx.order.update({ where: { id: orderId }, data });

    await emitOrderEvent(tx, {
      orderId,
      tenantId: order.tenantId,
      storeId: order.storeId,
      eventType: "ORDER_STATUS_CHANGED",
      message: `Status changed to ${status}`,
      payload: { previousStatus: order.status, newStatus: status },
    });

    return upd;
  });

  return updated;
}
