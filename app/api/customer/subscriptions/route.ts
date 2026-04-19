import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserAuthContext } from "@/lib/auth/context";
import { listCustomerSubscriptions } from "@/services/customer.service";
import { resolveScopeFromCookie } from "@/lib/api/customer-scope";

/**
 * GET /api/customer/subscriptions
 * Reads `beyond_store_ctx` cookie to optionally scope results to a single store.
 */
export async function GET(req: NextRequest) {
  try {
    const ctx = await getCurrentUserAuthContext();
    if (!ctx) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

    const scope = await resolveScopeFromCookie(req);
    const subscriptions = await listCustomerSubscriptions(ctx.email, scope);
    return NextResponse.json({ subscriptions });
  } catch (err) {
    console.error("[customer/subscriptions] Unexpected error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
