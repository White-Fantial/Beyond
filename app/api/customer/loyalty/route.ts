import { NextResponse } from "next/server";
import { getCurrentUserAuthContext } from "@/lib/auth/context";
import { getLoyaltyAccount } from "@/services/customer.service";

/**
 * GET /api/customer/loyalty
 * Returns the loyalty summary (account, tier, next tier, referral code).
 */
export async function GET() {
  const ctx = await getCurrentUserAuthContext();
  if (!ctx) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const summary = await getLoyaltyAccount(ctx.userId);
  return NextResponse.json({ data: summary });
}
