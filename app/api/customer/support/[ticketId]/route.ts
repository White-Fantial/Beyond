import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/permissions";
import { PERMISSIONS } from "@/lib/auth/constants";
import { getCustomerTicketDetail } from "@/services/customer-support.service";

export async function GET(
  _req: NextRequest,
  { params }: { params: { ticketId: string } }
) {
  try {
    const { ticketId } = params;
    const ctx = await requirePermission(PERMISSIONS.CUSTOMER_APP);
    const data = await getCustomerTicketDetail(ctx.userId, ticketId);
    return NextResponse.json({ data });
  } catch (err) {
    console.error("[customer/support/:id GET]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
