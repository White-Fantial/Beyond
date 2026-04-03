import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserAuthContext } from "@/lib/auth/context";
import { OWNER_PORTAL_MEMBERSHIP_ROLES } from "@/lib/auth/constants";
import { markAllNotificationsRead } from "@/services/owner/owner-notification.service";

/**
 * POST /api/owner/notifications/read-all
 * Marks all unread notifications as read for the current user.
 */
export async function POST(_req: NextRequest) {
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

    const count = await markAllNotificationsRead(tenantId, ctx.userId);

    return NextResponse.json({ data: { updated: count } });
  } catch (err) {
    console.error("[owner/notifications/read-all] Unexpected error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
