import { NextRequest, NextResponse } from "next/server";
import { getStoreBySlugForCustomer, getGuestOrderStatus } from "@/services/customer-menu.service";

/**
 * GET /api/store/[storeSlug]/orders/[orderId]
 *
 * Public order status endpoint for the confirmation page.
 * No authentication required.
 * Scoped by both storeSlug and orderId to prevent enumeration.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: { storeSlug: string; orderId: string } }
) {
  try {
    const { storeSlug, orderId } = params;

    const store = await getStoreBySlugForCustomer(storeSlug);
    if (!store) {
      return NextResponse.json({ error: "Store not found" }, { status: 404 });
    }

    const status = await getGuestOrderStatus(store.id, orderId);
    if (!status) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    return NextResponse.json({ data: status });
  } catch (err) {
    console.error("[store/orders/status] Unexpected error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
