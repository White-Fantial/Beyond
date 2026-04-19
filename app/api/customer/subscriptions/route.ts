import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserAuthContext } from "@/lib/auth/context";
import { listCustomerSubscriptions } from "@/services/customer.service";
import { CUSTOMER_STORE_COOKIE } from "@/lib/customer-store-context";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/customer/subscriptions
 * Reads `beyond_store_ctx` cookie to optionally scope results to a single store.
 */
export async function GET(req: NextRequest) {
  try {
    const ctx = await getCurrentUserAuthContext();
    if (!ctx) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

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

    const subscriptions = await listCustomerSubscriptions(ctx.email, scope);
    return NextResponse.json({ subscriptions });
  } catch (err) {
    console.error("[customer/subscriptions] Unexpected error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
