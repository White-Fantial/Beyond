import { NextRequest, NextResponse } from "next/server";
import { requireStoreAccess } from "@/lib/auth/permissions";
import { listLiveOrders } from "@/services/backoffice/backoffice-orders.service";

/**
 * GET /api/backoffice/[storeId]/orders
 *
 * Returns live (in-flight) orders for the Kanban board.
 * Statuses returned: RECEIVED, ACCEPTED, IN_PROGRESS, READY.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: { storeId: string } }
) {
  try {
    const { storeId } = params;
    await requireStoreAccess(storeId);
    const data = await listLiveOrders(storeId);
    return NextResponse.json({ data });
  } catch (err) {
    console.error("[backoffice/orders] Unexpected error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
