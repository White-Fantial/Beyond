/**
 * PATCH /api/orders/[orderId]/status
 *
 * Transition a canonical order to a new lifecycle status.
 * Body: { status: OrderStatus }
 *
 * Requires ORDERS permission for the order's store.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireStorePermission } from "@/lib/auth/permissions";
import { PERMISSIONS } from "@/lib/auth/constants";
import {
  getOrderById,
  updateOrderStatus,
  OrderNotFoundError,
} from "@/services/order.service";
import type { OrderStatus } from "@prisma/client";

const VALID_STATUSES: OrderStatus[] = [
  "RECEIVED",
  "ACCEPTED",
  "IN_PROGRESS",
  "READY",
  "COMPLETED",
  "CANCELLED",
  "FAILED",
];

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const { orderId } = await params;

  // Fetch order first to verify store membership
  const order = await getOrderById(orderId);
  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  await requireStorePermission(order.storeId, PERMISSIONS.ORDERS);

  const body = await req.json() as { status?: unknown };
  const status = body.status as OrderStatus | undefined;

  if (!status || !VALID_STATUSES.includes(status)) {
    return NextResponse.json(
      { error: `status must be one of: ${VALID_STATUSES.join(", ")}` },
      { status: 400 }
    );
  }

  try {
    const updated = await updateOrderStatus(orderId, status);
    return NextResponse.json({ order: updated });
  } catch (err) {
    if (err instanceof OrderNotFoundError) {
      return NextResponse.json({ error: err.message }, { status: 404 });
    }
    throw err;
  }
}
