import { NextRequest, NextResponse } from "next/server";
import { requireOwnerStoreAccess, resolveActorTenantId } from "@/services/owner/owner-authz.service";
import {
  deselectProductFromStore,
  updateStoreProductSelection,
} from "@/services/owner/owner-tenant-products.service";

interface Params {
  params: Promise<{ storeId: string; tenantProductId: string }>;
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const { storeId, tenantProductId } = await params;
  try {
    const ctx = await requireOwnerStoreAccess(storeId);
    const tenantId = resolveActorTenantId(ctx, storeId);
    const body = await req.json();
    const selection = await updateStoreProductSelection(
      tenantId,
      storeId,
      tenantProductId,
      ctx.userId,
      {
        customPriceAmount: body.customPriceAmount,
        isActive: body.isActive,
      }
    );
    return NextResponse.json({ data: selection });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 400 });
  }
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

