import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserAuthContext } from "@/lib/auth/context";
import { listCustomerOrders } from "@/services/customer.service";
import { CUSTOMER_STORE_COOKIE } from "@/lib/customer-store-context";
import { prisma } from "@/lib/prisma";

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

    // Optionally scope to the store recorded in the cookie
    const cookieStoreId = req.cookies.get(CUSTOMER_STORE_COOKIE)?.value;
    let scope: { tenantId: string; storeId: string } | undefined;
    if (cookieStoreId) {
      const store = await prisma.store.findFirst({
        where: { id: cookieStoreId, status: { not: "ARCHIVED" } },
        select: { tenantId: true },
      });
      if (store) scope = { tenantId: store.tenantId, storeId: cookieStoreId };
    }

    const result = await listCustomerOrders(ctx.email, { status, limit, offset }, scope);
    return NextResponse.json(result);
  } catch (err) {
    console.error("[customer/orders] Unexpected error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
