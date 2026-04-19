import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/permissions";
import { PERMISSIONS } from "@/lib/auth/constants";
import { replyToCustomerTicket } from "@/services/customer-support.service";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ ticketId: string }> }
) {
  try {
    const { ticketId } = await params;
    const ctx = await requirePermission(PERMISSIONS.CUSTOMER_APP);
    const { body } = await req.json();
    if (!body?.trim()) {
      return NextResponse.json({ error: "body is required" }, { status: 400 });
    }
    const msg = await replyToCustomerTicket(ctx.userId, ticketId, body);
    return NextResponse.json({ data: msg }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("Cannot reply")) {
      return NextResponse.json({ error: message }, { status: 422 });
    }
    console.error("[customer/support/:id/reply POST]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
