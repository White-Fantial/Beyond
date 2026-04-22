import { NextRequest, NextResponse } from "next/server";
import { requireOwnerPortalAccess } from "@/lib/owner/auth-guard";
import {
  listTenantModifierGroups,
  createTenantModifierGroup,
} from "@/services/owner/owner-tenant-modifiers.service";

export async function GET() {
  try {
    const ctx = await requireOwnerPortalAccess();
    const tenantId = ctx.tenantMemberships[0]?.tenantId ?? "";
    const groups = await listTenantModifierGroups(tenantId);
    return NextResponse.json({ data: groups });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await requireOwnerPortalAccess();
    const tenantId = ctx.tenantMemberships[0]?.tenantId ?? "";
    const body = await req.json();
    if (!body.name?.trim()) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }
    const group = await createTenantModifierGroup(tenantId, ctx.userId, {
      name: body.name,
      description: body.description ?? null,
      selectionMin: body.selectionMin ?? 0,
      selectionMax: body.selectionMax ?? null,
      isRequired: body.isRequired ?? false,
      displayOrder: body.displayOrder ?? 0,
    });
    return NextResponse.json({ data: group }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
