import { NextRequest, NextResponse } from "next/server";
import { requireOwnerPortalAccess } from "@/lib/owner/auth-guard";
import { OWNER_PORTAL_MEMBERSHIP_ROLES } from "@/lib/auth/constants";
import { getOwnerMenuImportRun } from "@/services/owner/owner-menu-imports.service";

interface Params {
  params: Promise<{ connectionId: string; runId: string }>;
}

export async function GET(_req: NextRequest, { params }: Params) {
  const { connectionId, runId } = await params;

  try {
    const ctx = await requireOwnerPortalAccess();
    const ownerMembership =
      ctx.tenantMemberships.find((tm) =>
        OWNER_PORTAL_MEMBERSHIP_ROLES.includes(tm.membershipRole)
      ) ?? ctx.tenantMemberships[0];
    const tenantId = ownerMembership?.tenantId ?? "";

    if (!tenantId) {
      return NextResponse.json({ error: "No tenant context" }, { status: 403 });
    }

    const result = await getOwnerMenuImportRun({
      tenantId,
      connectionId,
      runId,
    });

    return NextResponse.json({ data: result });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 404 });
  }
}
