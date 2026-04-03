/**
 * Backoffice Orders Service — Phase 2.
 *
 * Live order management for store operations staff.
 * All queries scoped to storeId.
 */
import { prisma } from "@/lib/prisma";
import type {
  BackofficeLiveOrder,
  BackofficeOrderDetail,
  BackofficeLiveOrdersData,
  BackofficeOrderModifier,
  BackofficeOrderItem,
  BackofficeOrderEvent,
  BackofficeOrderChannel,
} from "@/types/backoffice";

// Status transition rules — each status maps to its valid next states.
export const VALID_TRANSITIONS: Record<string, string[]> = {
  RECEIVED: ["ACCEPTED", "CANCELLED"],
  ACCEPTED: ["IN_PROGRESS", "CANCELLED"],
  IN_PROGRESS: ["READY", "CANCELLED"],
  READY: ["COMPLETED", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: [],
  FAILED: [],
};

export function isValidTransition(from: string, to: string): boolean {
  return (VALID_TRANSITIONS[from] ?? []).includes(to);
}

// Active statuses shown on the live board
const LIVE_STATUSES = ["RECEIVED", "ACCEPTED", "IN_PROGRESS", "READY"] as const;

function ageMinutes(orderedAt: Date): number {
  return Math.floor((Date.now() - orderedAt.getTime()) / 60_000);
}

function toChannel(raw: string | null): BackofficeOrderChannel {
  return (raw ?? "UNKNOWN") as BackofficeOrderChannel;
}

export async function listLiveOrders(storeId: string): Promise<BackofficeLiveOrdersData> {
  const orders = await prisma.order.findMany({
    where: { storeId, status: { in: [...LIVE_STATUSES] } },
    orderBy: { orderedAt: "asc" },
    select: {
      id: true,
      status: true,
      sourceChannel: true,
      orderedAt: true,
      customerName: true,
      customerPhone: true,
      totalAmount: true,
      currencyCode: true,
      _count: { select: { items: true } },
    },
  });

  const liveOrders: BackofficeLiveOrder[] = orders.map((o) => ({
    id: o.id,
    status: o.status,
    sourceChannel: toChannel(o.sourceChannel),
    orderedAt: o.orderedAt.toISOString(),
    ageMinutes: ageMinutes(o.orderedAt),
    customerName: o.customerName ?? null,
    customerPhone: o.customerPhone ?? null,
    totalAmount: o.totalAmount,
    currencyCode: o.currencyCode ?? "NZD",
    itemCount: o._count.items,
  }));

  return { orders: liveOrders, total: liveOrders.length };
}

export async function getBackofficeOrderDetail(
  storeId: string,
  orderId: string
): Promise<BackofficeOrderDetail | null> {
  const order = await prisma.order.findFirst({
    where: { id: orderId, storeId },
    include: {
      items: {
        include: {
          modifiers: { select: { modifierOptionName: true, unitPriceAmount: true } },
        },
      },
      events: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!order) return null;

  const items: BackofficeOrderItem[] = order.items.map((item) => ({
    id: item.id,
    productName: item.productName,
    quantity: item.quantity,
    unitPriceAmount: item.unitPriceAmount,
    totalPriceAmount: item.totalPriceAmount,
    notes: item.notes ?? null,
    modifiers: item.modifiers.map(
      (m): BackofficeOrderModifier => ({
        modifierOptionName: m.modifierOptionName,
        // DB field is nullable; coerce to 0 so the type stays `number`.
        unitPriceAmount: m.unitPriceAmount ?? 0,
      })
    ),
  }));

  const events: BackofficeOrderEvent[] = order.events.map((e) => ({
    id: e.id,
    eventType: e.eventType,
    message: e.message ?? null,
    createdAt: e.createdAt.toISOString(),
  }));

  return {
    id: order.id,
    status: order.status,
    sourceChannel: toChannel(order.sourceChannel),
    orderedAt: order.orderedAt.toISOString(),
    ageMinutes: ageMinutes(order.orderedAt),
    customerName: order.customerName ?? null,
    customerPhone: order.customerPhone ?? null,
    customerEmail: order.customerEmail ?? null,
    totalAmount: order.totalAmount,
    currencyCode: order.currencyCode ?? "NZD",
    itemCount: items.length,
    subtotalAmount: order.subtotalAmount,
    discountAmount: order.discountAmount,
    taxAmount: order.taxAmount,
    tipAmount: order.tipAmount,
    notes: order.notes ?? null,
    items,
    events,
  };
}

export async function updateBackofficeOrderStatus(
  storeId: string,
  orderId: string,
  newStatus: string
): Promise<{ success: boolean; error?: string }> {
  const order = await prisma.order.findFirst({
    where: { id: orderId, storeId },
    select: { status: true, tenantId: true },
  });

  if (!order) return { success: false, error: "Order not found" };

  if (!isValidTransition(order.status, newStatus)) {
    return {
      success: false,
      error: `Cannot transition from ${order.status} to ${newStatus}`,
    };
  }

  const data: Record<string, unknown> = { status: newStatus };
  if (newStatus === "ACCEPTED") data.acceptedAt = new Date();
  if (newStatus === "COMPLETED") data.completedAt = new Date();
  if (newStatus === "CANCELLED") data.cancelledAt = new Date();

  await prisma.$transaction([
    prisma.order.update({ where: { id: orderId }, data }),
    prisma.orderEvent.create({
      data: {
        orderId,
        tenantId: order.tenantId,
        storeId,
        eventType: "ORDER_STATUS_CHANGED",
        message: `Status changed to ${newStatus}`,
      },
    }),
  ]);

  return { success: true };
}
