import { NextRequest, NextResponse } from "next/server";
import { requireOwnerPortalAccess } from "@/lib/owner/auth-guard";
import { createTenantModifierOption } from "@/services/owner/owner-tenant-modifiers.service";

interface Params {
  params: Promise<{ groupId: string }>;
}

export async function POST(req: NextRequest, { params }: Params) {
  const { groupId } = await params;
  try {
    const ctx = await requireOwnerPortalAccess();
    const tenantId = ctx.tenantMemberships[0]?.tenantId ?? "";
    const body = await req.json();
    if (!body.name?.trim()) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }
    const option = await createTenantModifierOption(tenantId, groupId, ctx.userId, {
      name: body.name,
      priceDeltaAmount: body.priceDeltaAmount ?? 0,
      currency: body.currency ?? "USD",
      displayOrder: body.displayOrder ?? 0,
      isDefault: body.isDefault ?? false,
    });
    return NextResponse.json({ data: option }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
