import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserAuthContext } from "@/lib/auth/context";
import { OWNER_PORTAL_MEMBERSHIP_ROLES } from "@/lib/auth/constants";
import { getRevenueForecast } from "@/services/owner/owner-analytics.service";
import type { ForecastHorizon } from "@/types/owner-analytics";

/**
 * GET /api/owner/analytics/forecast
 * Query: storeId, horizon (7 | 14 | 30)
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
    const storeId = searchParams.get("storeId") ?? undefined;
    const rawHorizon = parseInt(searchParams.get("horizon") ?? "7", 10);
    const horizon: ForecastHorizon = [7, 14, 30].includes(rawHorizon)
      ? (rawHorizon as ForecastHorizon)
      : 7;

    const data = await getRevenueForecast(tenantId, storeId, horizon);
    return NextResponse.json({ data });
  } catch (err) {
    console.error("[owner/analytics/forecast] Unexpected error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
