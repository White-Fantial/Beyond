import { NextRequest, NextResponse } from "next/server";
import { requireOwnerStoreAccess, resolveActorTenantId } from "@/services/owner/owner-authz.service";
import { updateOwnerProduct } from "@/services/owner/owner-catalog.service";

interface Params {
  params: { storeId: string; productId: string };
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const ctx = await requireOwnerStoreAccess(params.storeId);
    const tenantId = resolveActorTenantId(ctx, params.storeId);
    const body = await req.json();

    // Only local fields are accepted — strip any source-locked fields
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { name: _name, basePriceAmount: _basePriceAmount, sourceType: _sourceType, sourceProductRef: _sourceProductRef, sku: _sku, barcode: _barcode, ...safeData } = body;

    await updateOwnerProduct({
      productId: params.productId,
      storeId: params.storeId,
      tenantId,
      actorUserId: ctx.userId,
      data: safeData,
    });

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
