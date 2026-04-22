import { NextRequest, NextResponse } from "next/server";
import { requireOwnerPortalAccess } from "@/lib/owner/auth-guard";
import {
  updateTenantModifierGroup,
  deleteTenantModifierGroup,
} from "@/services/owner/owner-tenant-modifiers.service";

interface Params {
  params: Promise<{ groupId: string }>;
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const { groupId } = await params;
  try {
    const ctx = await requireOwnerPortalAccess();
    const tenantId = ctx.tenantMemberships[0]?.tenantId ?? "";
    const body = await req.json();
    const group = await updateTenantModifierGroup(tenantId, groupId, ctx.userId, {
      name: body.name,
      description: body.description,
      selectionMin: body.selectionMin,
      selectionMax: body.selectionMax,
      isRequired: body.isRequired,
      displayOrder: body.displayOrder,
      isActive: body.isActive,
    });
    return NextResponse.json({ data: group });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { groupId } = await params;
  try {
    const ctx = await requireOwnerPortalAccess();
    const tenantId = ctx.tenantMemberships[0]?.tenantId ?? "";
    await deleteTenantModifierGroup(tenantId, groupId, ctx.userId);
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
