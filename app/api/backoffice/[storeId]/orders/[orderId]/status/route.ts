import { NextRequest, NextResponse } from "next/server";
import { requireStoreAccess } from "@/lib/auth/permissions";
import { updateBackofficeOrderStatus, VALID_TRANSITIONS } from "@/services/backoffice/backoffice-orders.service";

/**
 * PATCH /api/backoffice/[storeId]/orders/[orderId]/status
 *
 * Advances an order to the next status.
 * Body: { status: string }
 * Enforces valid transition rules.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { storeId: string; orderId: string } }
) {
  try {
    const { storeId, orderId } = params;
    await requireStoreAccess(storeId);

    const body = await req.json() as { status?: unknown };
    const newStatus = body.status as string | undefined;

    if (!newStatus || typeof newStatus !== "string") {
      return NextResponse.json({ error: "status is required" }, { status: 400 });
    }

    const allStatuses = Object.keys(VALID_TRANSITIONS);
    if (!allStatuses.includes(newStatus)) {
      return NextResponse.json({ error: `Invalid status: ${newStatus}` }, { status: 400 });
    }

    const result = await updateBackofficeOrderStatus(storeId, orderId, newStatus);
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 422 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[backoffice/orders/status] Unexpected error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
