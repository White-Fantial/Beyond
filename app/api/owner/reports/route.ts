import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserAuthContext } from "@/lib/auth/context";
import { OWNER_PORTAL_MEMBERSHIP_ROLES } from "@/lib/auth/constants";
import { parseReportFilters } from "@/lib/owner/reports/filters";
import { getTenantOwnerReports } from "@/services/owner/reports/owner-reports.service";

export async function GET(request: NextRequest) {
  try {
    const ctx = await getCurrentUserAuthContext();
    if (!ctx) {
      return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
    }

    const ownerMembership = ctx.tenantMemberships.find((tm) =>
      OWNER_PORTAL_MEMBERSHIP_ROLES.includes(tm.membershipRole)
    );
    if (!ownerMembership && !ctx.isPlatformAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const tenantId = ownerMembership?.tenantId ?? ctx.tenantMemberships[0]?.tenantId;
    if (!tenantId) {
      return NextResponse.json({ error: "No tenant context" }, { status: 403 });
    }

    const filters = parseReportFilters(request.nextUrl.searchParams);
    const data = await getTenantOwnerReports({ tenantId, filters });

    return NextResponse.json({ data });
  } catch (err) {
    console.error("[owner/reports] Unexpected error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
