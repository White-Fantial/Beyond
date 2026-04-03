import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserAuthContext } from "@/lib/auth/context";
import { OWNER_PORTAL_MEMBERSHIP_ROLES } from "@/lib/auth/constants";
import { getRoleChangeHistory } from "@/services/owner/owner-activity.service";

/**
 * GET /api/owner/activity/roles
 * Query: storeId, actorUserId, startDate, endDate, page, pageSize
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
    const actorUserId = searchParams.get("actorUserId") ?? undefined;
    const startDate = searchParams.get("startDate") ?? undefined;
    const endDate = searchParams.get("endDate") ?? undefined;
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get("pageSize") ?? "50", 10)));

    const result = await getRoleChangeHistory(tenantId, {
      storeId,
      actorUserId,
      startDate,
      endDate,
      page,
      pageSize,
    });

    return NextResponse.json({ data: result });
  } catch (err) {
    console.error("[owner/activity/roles] Unexpected error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
