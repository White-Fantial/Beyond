import { NextRequest, NextResponse } from "next/server";
import { requireOwnerPortalAccess } from "@/lib/owner/auth-guard";
import { OWNER_PORTAL_MEMBERSHIP_ROLES } from "@/lib/auth/constants";
import { requestOwnerCatalogSync } from "@/services/owner/owner-integrations.service";

interface Params {
  params: { connectionId: string };
}

export async function POST(_req: NextRequest, { params }: Params) {
  try {
    const ctx = await requireOwnerPortalAccess();

    const ownerMembership = ctx.tenantMemberships.find((tm) =>
      OWNER_PORTAL_MEMBERSHIP_ROLES.includes(tm.membershipRole)
    ) ?? ctx.tenantMemberships[0];

    const tenantId = ownerMembership?.tenantId ?? "";
    if (!tenantId) return NextResponse.json({ error: "No tenant context" }, { status: 403 });

    // Verify the connection belongs to this tenant before triggering sync
    const { prisma } = await import("@/lib/prisma");
    const connection = await prisma.connection.findFirst({
      where: { id: params.connectionId, tenantId },
      select: { storeId: true },
    });
    if (!connection) {
      return NextResponse.json({ error: "Connection not found" }, { status: 404 });
    }

    const result = await requestOwnerCatalogSync(
      connection.storeId,
      tenantId,
      ctx.userId
    );

    return NextResponse.json(result);
  } catch (err: unknown) {
    console.error("[owner/integrations/sync] POST error:", err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
