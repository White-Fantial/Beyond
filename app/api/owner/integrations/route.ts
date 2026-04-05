import { NextRequest, NextResponse } from "next/server";
import { requireOwnerPortalAccess } from "@/lib/owner/auth-guard";
import { OWNER_PORTAL_MEMBERSHIP_ROLES } from "@/lib/auth/constants";
import { getOwnerTenantConnectionCards } from "@/services/owner/owner-integrations.service";

export async function GET(_req: NextRequest) {
  try {
    const ctx = await requireOwnerPortalAccess();

    const ownerMembership = ctx.tenantMemberships.find((tm) =>
      OWNER_PORTAL_MEMBERSHIP_ROLES.includes(tm.membershipRole)
    ) ?? ctx.tenantMemberships[0];

    const tenantId = ownerMembership?.tenantId ?? "";
    if (!tenantId) return NextResponse.json({ error: "No tenant context" }, { status: 403 });

    const cards = await getOwnerTenantConnectionCards(tenantId);
    return NextResponse.json({ data: cards });
  } catch (err: unknown) {
    console.error("[owner/integrations] GET error:", err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
