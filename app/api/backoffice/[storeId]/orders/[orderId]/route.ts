import { NextRequest, NextResponse } from "next/server";
import { requireStoreAccess } from "@/lib/auth/permissions";
import { getBackofficeOrderDetail } from "@/services/backoffice/backoffice-orders.service";

/**
 * GET /api/backoffice/[storeId]/orders/[orderId]
 *
 * Returns full order detail including items, modifiers, and event timeline.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ storeId: string; orderId: string }> }
) {
  try {
    const { storeId, orderId } = await params;
    await requireStoreAccess(storeId);
    const data = await getBackofficeOrderDetail(storeId, orderId);
    if (!data) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }
    return NextResponse.json({ data });
  } catch (err) {
    console.error("[backoffice/orders/detail] Unexpected error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
