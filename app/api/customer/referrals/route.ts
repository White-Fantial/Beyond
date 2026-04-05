import { NextResponse } from "next/server";
import { getCurrentUserAuthContext } from "@/lib/auth/context";
import { getReferralStats } from "@/services/customer.service";

/**
 * GET /api/customer/referrals
 * Returns the authenticated user's referral stats (code, history, totals).
 */
export async function GET() {
  const ctx = await getCurrentUserAuthContext();
  if (!ctx) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const data = await getReferralStats(ctx.userId);
  return NextResponse.json({ data });
}
