import { NextRequest, NextResponse } from "next/server";
import { requireOwnerStoreAccess, resolveActorTenantId } from "@/services/owner/owner-authz.service";
import { reorderStoreModifierGroupSelections } from "@/services/owner/owner-tenant-modifiers.service";

interface Params {
  params: Promise<{ storeId: string }>;
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const { storeId } = await params;
  try {
    const ctx = await requireOwnerStoreAccess(storeId);
    const tenantId = resolveActorTenantId(ctx, storeId);
    const body = await req.json();
    if (!Array.isArray(body.orderedGroupIds)) {
      return NextResponse.json({ error: "orderedGroupIds must be an array" }, { status: 400 });
    }
    await reorderStoreModifierGroupSelections(storeId, tenantId, ctx.userId, body.orderedGroupIds);
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
