import { NextRequest, NextResponse } from "next/server";
import { requireOwnerStoreAccess, resolveActorTenantId } from "@/services/owner/owner-authz.service";
import { reorderStoreCategorySelections } from "@/services/owner/owner-tenant-products.service";

interface Params {
  params: Promise<{ storeId: string }>;
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const { storeId } = await params;
  try {
    const ctx = await requireOwnerStoreAccess(storeId);
    const tenantId = resolveActorTenantId(ctx, storeId);
    const body = await req.json();
    if (!Array.isArray(body.orderedCategoryIds)) {
      return NextResponse.json({ error: "orderedCategoryIds must be an array" }, { status: 400 });
    }
    await reorderStoreCategorySelections(storeId, tenantId, ctx.userId, body.orderedCategoryIds);
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
