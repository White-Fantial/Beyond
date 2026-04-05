import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserAuthContext } from "@/lib/auth/context";
import { getUserPushPreferences, updatePushPreferences } from "@/services/customer.service";
import type { PushPreferences } from "@/types/customer-referrals";

/**
 * GET /api/customer/push-preferences
 * Returns the authenticated user's push notification preferences.
 */
export async function GET() {
  const ctx = await getCurrentUserAuthContext();
  if (!ctx) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const data = await getUserPushPreferences(ctx.userId);
  return NextResponse.json({ data });
}

/**
 * PATCH /api/customer/push-preferences
 * Updates one or more push notification preference flags.
 */
export async function PATCH(req: NextRequest) {
  const ctx = await getCurrentUserAuthContext();
  if (!ctx) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const body = (await req.json()) as Partial<PushPreferences>;
  const data = await updatePushPreferences(ctx.userId, body);
  return NextResponse.json({ data });
}
