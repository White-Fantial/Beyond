import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserAuthContext } from "@/lib/auth/context";
import { OWNER_PORTAL_MEMBERSHIP_ROLES } from "@/lib/auth/constants";
import { getOwnerCustomerDetail } from "@/services/owner/customer-service";

interface Params {
  params: { customerId: string };
}

/**
 * GET /api/owner/customers/[customerId]
 * Returns customer overview/detail (KPIs, breakdowns, note).
 */
export async function GET(_req: NextRequest, { params }: Params) {
  const { customerId } = params;
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

    const detail = await getOwnerCustomerDetail(customerId, tenantId);
    if (!detail) return NextResponse.json({ error: "Not found" }, { status: 404 });

    return NextResponse.json({ data: detail });
  } catch (err) {
    console.error("[owner/customers/detail] Unexpected error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
