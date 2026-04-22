import { NextRequest, NextResponse } from "next/server";
import { requireOwnerPortalAccess } from "@/lib/owner/auth-guard";
import { reorderProductModifierGroups } from "@/services/owner/owner-tenant-modifiers.service";

interface Params {
  params: Promise<{ productId: string }>;
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const { productId } = await params;
  try {
    const ctx = await requireOwnerPortalAccess();
    const tenantId = ctx.tenantMemberships[0]?.tenantId ?? "";
    const body = await req.json();
    if (!Array.isArray(body.orderedGroupIds)) {
      return NextResponse.json({ error: "orderedGroupIds must be an array" }, { status: 400 });
    }
    await reorderProductModifierGroups(tenantId, productId, ctx.userId, body.orderedGroupIds);
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
