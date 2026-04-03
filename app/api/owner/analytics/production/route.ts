import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserAuthContext } from "@/lib/auth/context";
import { OWNER_PORTAL_MEMBERSHIP_ROLES } from "@/lib/auth/constants";
import { getProductionEstimates } from "@/services/owner/owner-analytics.service";

/**
 * GET /api/owner/analytics/production
 * Query: storeId, storeIds (comma-separated), weekStartDate (YYYY-MM-DD)
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
    const singleStore = searchParams.get("storeId");
    const multiStore = searchParams.get("storeIds");
    const weekStartDate = searchParams.get("weekStartDate") ?? undefined;

    let storeIds: string[] | undefined;
    if (singleStore) {
      storeIds = [singleStore];
    } else if (multiStore) {
      storeIds = multiStore.split(",").map((s) => s.trim()).filter(Boolean);
    }

    const data = await getProductionEstimates(tenantId, storeIds, weekStartDate);
    return NextResponse.json({ data });
  } catch (err) {
    console.error("[owner/analytics/production] Unexpected error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
