import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserAuthContext } from "@/lib/auth/context";
import { OWNER_PORTAL_MEMBERSHIP_ROLES } from "@/lib/auth/constants";
import { getChurnRiskSignals } from "@/services/owner/owner-analytics.service";

/**
 * GET /api/owner/analytics/churn
 * Query: windowDays (default 90)
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
    const rawWindow = parseInt(searchParams.get("windowDays") ?? "90", 10);
    const windowDays = Number.isFinite(rawWindow) && rawWindow > 0 ? rawWindow : 90;

    const data = await getChurnRiskSignals(tenantId, windowDays);
    return NextResponse.json({ data });
  } catch (err) {
    console.error("[owner/analytics/churn] Unexpected error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
