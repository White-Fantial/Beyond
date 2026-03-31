/**
 * POST /api/orders/[orderId]/forward-to-pos
 *
 * Mark a canonical order as forwarded to POS for docket printing.
 * Body: { posConnectionId: string; requestPayload?: object }
 *
 * Requires ORDERS permission for the order's store.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireStorePermission } from "@/lib/auth/permissions";
import { PERMISSIONS } from "@/lib/auth/constants";
import {
  getOrderById,
  forwardOrderToPos,
  OrderNotFoundError,
} from "@/services/order.service";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const { orderId } = await params;

  const order = await getOrderById(orderId);
  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  await requireStorePermission(order.storeId, PERMISSIONS.ORDERS);

  const body = await req.json() as { posConnectionId?: unknown; requestPayload?: unknown };
  const { posConnectionId, requestPayload } = body;

  if (!posConnectionId || typeof posConnectionId !== "string") {
    return NextResponse.json({ error: "posConnectionId is required" }, { status: 400 });
  }

  try {
    const updated = await forwardOrderToPos({
      orderId,
      posConnectionId,
      requestPayload: requestPayload as object | undefined,
    });
    return NextResponse.json({ order: updated });
  } catch (err) {
    if (err instanceof OrderNotFoundError) {
      return NextResponse.json({ error: err.message }, { status: 404 });
    }
    throw err;
  }
}
