import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/permissions";
import { applyPromoCode } from "@/services/owner/owner-promotions.service";

export async function POST(req: NextRequest) {
  try {
    const ctx = await requireAuth();
    const tenantId = ctx.tenantMemberships[0]?.tenantId ?? "";
    const { code, orderAmountMinor, orderId } = await req.json();
    if (!code || typeof orderAmountMinor !== "number") {
      return NextResponse.json(
        { error: "code and orderAmountMinor are required" },
        { status: 400 }
      );
    }
    const result = await applyPromoCode(tenantId, code, orderAmountMinor, ctx.userId, orderId);
    return NextResponse.json({ data: result });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "";
    if (
      message.includes("not valid") ||
      message.includes("expired") ||
      message.includes("limit") ||
      message.includes("Minimum")
    ) {
      return NextResponse.json({ error: message }, { status: 422 });
    }
    console.error("[owner/promotions/apply POST]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
