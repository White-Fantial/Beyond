import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/permissions";
import { PERMISSIONS } from "@/lib/auth/constants";
import { listCustomerTickets, createCustomerTicket } from "@/services/customer-support.service";

export async function GET(req: NextRequest) {
  try {
    const ctx = await requirePermission(PERMISSIONS.CUSTOMER_APP);
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") ?? "1");
    const data = await listCustomerTickets(ctx.userId, { page, pageSize: 20 });
    return NextResponse.json({ data });
  } catch (err) {
    console.error("[customer/support GET]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await requirePermission(PERMISSIONS.CUSTOMER_APP);
    const tenantId = ctx.tenantMemberships[0]?.tenantId ?? "";
    const body = await req.json();
    const ticket = await createCustomerTicket(ctx.userId, tenantId, body);
    return NextResponse.json({ data: ticket }, { status: 201 });
  } catch (err) {
    console.error("[customer/support POST]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
