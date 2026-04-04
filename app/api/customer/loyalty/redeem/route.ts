import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserAuthContext } from "@/lib/auth/context";
import {
  redeemLoyaltyPoints,
  LoyaltyAccountNotFoundError,
  LoyaltyInsufficientPointsError,
} from "@/services/customer.service";

/**
 * POST /api/customer/loyalty/redeem
 * Body: { orderId: string, points: number }
 */
export async function POST(req: NextRequest) {
  try {
    const ctx = await getCurrentUserAuthContext();
    if (!ctx) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { orderId, points } = body as { orderId?: string; points?: number };

    if (!orderId || typeof points !== "number") {
      return NextResponse.json({ error: "orderId and points are required" }, { status: 400 });
    }

    const account = await redeemLoyaltyPoints(ctx.userId, orderId, points);
    return NextResponse.json({ data: account });
  } catch (err) {
    if (err instanceof LoyaltyInsufficientPointsError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    if (err instanceof LoyaltyAccountNotFoundError) {
      return NextResponse.json({ error: err.message }, { status: 404 });
    }
    console.error("[customer/loyalty/redeem POST]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
