import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/permissions";
import { PERMISSIONS } from "@/lib/auth/constants";
import { listCustomerReviews, createCustomerReview } from "@/services/customer-reviews.service";

export async function GET(req: NextRequest) {
  try {
    const ctx = await requirePermission(PERMISSIONS.CUSTOMER_APP);
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") ?? "1");
    const data = await listCustomerReviews(ctx.userId, { page, pageSize: 20 });
    return NextResponse.json({ data });
  } catch (err) {
    console.error("[customer/reviews GET]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await requirePermission(PERMISSIONS.CUSTOMER_APP);
    const tenantId = ctx.tenantMemberships[0]?.tenantId ?? "";
    const body = await req.json();
    const review = await createCustomerReview(ctx.userId, tenantId, body);
    return NextResponse.json({ data: review }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("Rating must be")) {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    console.error("[customer/reviews POST]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
