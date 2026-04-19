import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserAuthContext } from "@/lib/auth/context";
import { OWNER_PORTAL_MEMBERSHIP_ROLES } from "@/lib/auth/constants";
import { getOwnerCustomerSubscriptions } from "@/services/owner/customer-service";

interface Params {
  params: Promise<{ customerId: string }>;
}

/**
 * GET /api/owner/customers/[customerId]/subscriptions
 */
export async function GET(_req: NextRequest, { params }: Params) {
  const { customerId } = await params;
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

    const subscriptions = await getOwnerCustomerSubscriptions(customerId, tenantId);
    return NextResponse.json({ data: subscriptions });
  } catch (err) {
    console.error("[owner/customers/subscriptions] Unexpected error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
