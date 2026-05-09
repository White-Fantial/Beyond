import { NextRequest, NextResponse } from "next/server";
import { requireOwnerPortalAccess } from "@/lib/owner/auth-guard";
import { OWNER_PORTAL_MEMBERSHIP_ROLES } from "@/lib/auth/constants";
import { createOwnerMenuImportPreview } from "@/services/owner/owner-menu-imports.service";

interface Params {
  params: Promise<{ connectionId: string }>;
}

export async function POST(req: NextRequest, { params }: Params) {
  const { connectionId } = await params;

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

    const body = (await req.json().catch(() => ({}))) as { overwriteExisting?: boolean };

    const result = await createOwnerMenuImportPreview({
      tenantId,
      connectionId,
      overwriteExisting: Boolean(body.overwriteExisting),
      actorUserId: ctx.userId,
    });

    return NextResponse.json({ data: result }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
