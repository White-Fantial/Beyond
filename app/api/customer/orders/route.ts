import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserAuthContext } from "@/lib/auth/context";
import { listCustomerOrders } from "@/services/customer.service";
import { resolveScopeFromCookie } from "@/lib/api/customer-scope";

/**
 * GET /api/customer/orders
 * Query: status, limit, offset
 * Reads `beyond_store_ctx` cookie to optionally scope results to a single store.
 */
export async function GET(req: NextRequest) {
  try {
    const ctx = await getCurrentUserAuthContext();
    if (!ctx) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") ?? undefined;
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "20", 10), 100);
    const offset = parseInt(searchParams.get("offset") ?? "0", 10);

    const scope = await resolveScopeFromCookie(req);
    const result = await listCustomerOrders(ctx.email, { status, limit, offset }, scope);
    return NextResponse.json(result);
  } catch (err) {
    console.error("[customer/orders] Unexpected error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
