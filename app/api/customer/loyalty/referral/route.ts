import { NextResponse } from "next/server";
import { getCurrentUserAuthContext } from "@/lib/auth/context";
import { getReferralCode } from "@/services/customer.service";

/**
 * GET /api/customer/loyalty/referral
 * Returns the referral code for the user, creating one if it doesn't exist.
 */
export async function GET() {
  const ctx = await getCurrentUserAuthContext();
  if (!ctx) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const referral = await getReferralCode(ctx.userId);
  return NextResponse.json({ data: referral });
}
