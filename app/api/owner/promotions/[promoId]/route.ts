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
    const data = await getPromoCodeDetail(ctx.tenantId, promoId);
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
    const body = await req.json();
    const data = await updatePromoCode(ctx.tenantId, promoId, body);
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
    await deletePromoCode(ctx.tenantId, promoId);
    return NextResponse.json({ data: null });
  } catch (err) {
    console.error("[owner/promotions/:id DELETE]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
