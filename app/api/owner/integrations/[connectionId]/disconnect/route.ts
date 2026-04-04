import { NextRequest, NextResponse } from "next/server";
import { requireOwnerAdminAccess } from "@/lib/owner/auth-guard";
import { OWNER_PORTAL_MEMBERSHIP_ROLES } from "@/lib/auth/constants";
import { disconnectOwnerConnection } from "@/services/owner/owner-integrations.service";

interface Params {
  params: { connectionId: string };
}

export async function POST(_req: NextRequest, { params }: Params) {
  try {
    const ctx = await requireOwnerAdminAccess();

    const ownerMembership = ctx.tenantMemberships.find((tm) =>
      OWNER_PORTAL_MEMBERSHIP_ROLES.includes(tm.membershipRole)
    ) ?? ctx.tenantMemberships[0];

    const tenantId = ownerMembership?.tenantId ?? "";
    if (!tenantId) return NextResponse.json({ error: "No tenant context" }, { status: 403 });

    await disconnectOwnerConnection(params.connectionId, tenantId, ctx.userId);

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error("[owner/integrations/disconnect] POST error:", err);
    const message = err instanceof Error ? err.message : String(err);
    if (message === "CONNECTION_NOT_FOUND") {
      return NextResponse.json({ error: "Connection not found" }, { status: 404 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
