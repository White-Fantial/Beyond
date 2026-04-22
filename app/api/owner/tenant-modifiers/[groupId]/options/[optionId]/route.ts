import { NextRequest, NextResponse } from "next/server";
import { requireOwnerPortalAccess } from "@/lib/owner/auth-guard";
import {
  updateTenantModifierOption,
  deleteTenantModifierOption,
} from "@/services/owner/owner-tenant-modifiers.service";

interface Params {
  params: Promise<{ groupId: string; optionId: string }>;
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const { groupId, optionId } = await params;
  try {
    const ctx = await requireOwnerPortalAccess();
    const tenantId = ctx.tenantMemberships[0]?.tenantId ?? "";
    const body = await req.json();
    const option = await updateTenantModifierOption(tenantId, groupId, optionId, ctx.userId, {
      name: body.name,
      priceDeltaAmount: body.priceDeltaAmount,
      currency: body.currency,
      displayOrder: body.displayOrder,
      isDefault: body.isDefault,
      isActive: body.isActive,
    });
    return NextResponse.json({ data: option });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { groupId, optionId } = await params;
  try {
    const ctx = await requireOwnerPortalAccess();
    const tenantId = ctx.tenantMemberships[0]?.tenantId ?? "";
    await deleteTenantModifierOption(tenantId, groupId, optionId, ctx.userId);
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
