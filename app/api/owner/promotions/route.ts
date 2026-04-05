import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/permissions";
import { listPromoCodes, createPromoCode } from "@/services/owner/owner-promotions.service";

export async function GET(req: NextRequest) {
  try {
    const ctx = await requireAuth();
    const { searchParams } = new URL(req.url);
    const filters = {
      status: (searchParams.get("status") as any) ?? undefined,
      storeId: searchParams.get("storeId") ?? undefined,
      page: searchParams.get("page") ? parseInt(searchParams.get("page")!) : 1,
      pageSize: 20,
    };
    const data = await listPromoCodes(ctx.tenantId, filters);
    return NextResponse.json({ data });
  } catch (err) {
    console.error("[owner/promotions GET]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await requireAuth();
    const body = await req.json();
    const promo = await createPromoCode(ctx.tenantId, ctx.userId, body);
    return NextResponse.json({ data: promo }, { status: 201 });
  } catch (err) {
    console.error("[owner/promotions POST]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
