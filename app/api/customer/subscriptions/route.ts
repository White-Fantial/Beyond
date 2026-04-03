import { NextResponse } from "next/server";
import { getCurrentUserAuthContext } from "@/lib/auth/context";
import { listCustomerSubscriptions } from "@/services/customer.service";

/**
 * GET /api/customer/subscriptions
 */
export async function GET() {
  try {
    const ctx = await getCurrentUserAuthContext();
    if (!ctx) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

    const subscriptions = await listCustomerSubscriptions(ctx.email);
    return NextResponse.json({ subscriptions });
  } catch (err) {
    console.error("[customer/subscriptions] Unexpected error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
