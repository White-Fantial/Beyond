import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserAuthContext } from "@/lib/auth/context";
import { OWNER_PORTAL_MEMBERSHIP_ROLES } from "@/lib/auth/constants";
import {
  getOwnerCustomers,
  getOwnerCustomerKpi,
} from "@/services/owner/customer-service";

/**
 * GET /api/owner/customers
 * Query: q, storeId, subscriptionStatus, sort, page, pageSize
 */
export async function GET(req: NextRequest) {
  try {
    const ctx = await getCurrentUserAuthContext();
    if (!ctx) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

    const ownerMembership = ctx.tenantMemberships.find((tm) =>
      OWNER_PORTAL_MEMBERSHIP_ROLES.includes(tm.membershipRole)
    );
    if (!ownerMembership && !ctx.isPlatformAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
    const tenantId = ownerMembership?.tenantId ?? ctx.tenantMemberships[0]?.tenantId;
    if (!tenantId) return NextResponse.json({ error: "No tenant context" }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q") ?? undefined;
    const storeId = searchParams.get("storeId") ?? undefined;
    const subscriptionStatus = (searchParams.get("subscriptionStatus") ?? undefined) as
      | "ACTIVE" | "PAUSED" | "CANCELLED" | "NONE" | undefined;
    const sort = (searchParams.get("sort") ?? "recent_activity") as
      | "recent_activity" | "lifetime_revenue" | "total_orders" | "newest_customer";
    const page = parseInt(searchParams.get("page") ?? "1", 10);
    const pageSize = Math.min(parseInt(searchParams.get("pageSize") ?? "25", 10), 100);

    const [result, kpi] = await Promise.all([
      getOwnerCustomers({ tenantId, q, storeId, subscriptionStatus, sort, page, pageSize }),
      getOwnerCustomerKpi(tenantId),
    ]);

    return NextResponse.json({ data: result, kpi });
  } catch (err) {
    console.error("[owner/customers] Unexpected error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
