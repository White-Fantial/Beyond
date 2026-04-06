import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/permissions";
import {
  getPromoCodeDetail,
  updatePromoCode,
  deletePromoCode,
} from "@/services/owner/owner-promotions.service";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ promoId: string }> }
) {
  try {
    const { promoId } = await params;
    const ctx = await requireAuth();
    const tenantId = ctx.tenantMemberships[0]?.tenantId ?? "";
    const data = await getPromoCodeDetail(tenantId, promoId);
    return NextResponse.json({ data });
  } catch (err) {
    console.error("[owner/promotions/:id GET]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ promoId: string }> }
) {
  try {
    const { promoId } = await params;
    const ctx = await requireAuth();
    const tenantId = ctx.tenantMemberships[0]?.tenantId ?? "";
    const body = await req.json();
    const data = await updatePromoCode(tenantId, promoId, body);
    return NextResponse.json({ data });
  } catch (err) {
    console.error("[owner/promotions/:id PATCH]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ promoId: string }> }
) {
  try {
    const { promoId } = await params;
    const ctx = await requireAuth();
    const tenantId = ctx.tenantMemberships[0]?.tenantId ?? "";
    await deletePromoCode(tenantId, promoId);
    return NextResponse.json({ data: null });
  } catch (err) {
    console.error("[owner/promotions/:id DELETE]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
