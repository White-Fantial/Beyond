import { NextRequest, NextResponse } from "next/server";
import { requireOwnerStoreAccess, resolveActorTenantId } from "@/services/owner/owner-authz.service";
import { deselectProductFromStore } from "@/services/owner/owner-tenant-products.service";

interface Params {
  params: Promise<{ storeId: string; tenantProductId: string }>;
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { storeId, tenantProductId } = await params;
  try {
    const ctx = await requireOwnerStoreAccess(storeId);
    const tenantId = resolveActorTenantId(ctx, storeId);

    await deselectProductFromStore(tenantId, storeId, tenantProductId, ctx.userId);

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
