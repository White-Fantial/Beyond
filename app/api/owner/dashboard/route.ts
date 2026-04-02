import { NextResponse } from "next/server";
import { getCurrentUserAuthContext } from "@/lib/auth/context";
import { OWNER_PORTAL_MEMBERSHIP_ROLES } from "@/lib/auth/constants";
import { getOwnerDashboard } from "@/services/owner/owner-dashboard.service";

/**
 * GET /api/owner/dashboard
 *
 * Returns the tenant-scoped Owner Dashboard data for the authenticated user.
 * Used by client-side refresh widgets and future mobile integrations.
 */
export async function GET() {
  try {
    const ctx = await getCurrentUserAuthContext();
    if (!ctx) {
      return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
    }

    // Allow platform admins only when they also have a tenant membership
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

    const data = await getOwnerDashboard({ tenantId, actorUserId: ctx.userId });
    return NextResponse.json({ data });
  } catch (err) {
    console.error("[owner/dashboard] Unexpected error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
