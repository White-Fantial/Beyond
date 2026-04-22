import { NextRequest, NextResponse } from "next/server";
import { requireOwnerStoreAccess, resolveActorTenantId } from "@/services/owner/owner-authz.service";
import { upsertStoreCategorySelection } from "@/services/owner/owner-tenant-products.service";

interface Params {
  params: Promise<{ storeId: string; tenantCategoryId: string }>;
}

export async function PUT(req: NextRequest, { params }: Params) {
  const { storeId, tenantCategoryId } = await params;
  try {
    const ctx = await requireOwnerStoreAccess(storeId);
    const tenantId = resolveActorTenantId(ctx, storeId);
    const body = await req.json();
    await upsertStoreCategorySelection(storeId, tenantId, tenantCategoryId, ctx.userId, {
      isEnabled: body.isEnabled,
      displayOrderOverride: body.displayOrderOverride,
    });
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
