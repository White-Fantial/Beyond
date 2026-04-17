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

    // Phase 1: name, basePriceAmount, and description are now editable in Beyond.
    // Strip only internal provenance fields that should never be overridden via API.
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { sourceType: _sourceType, sourceProductRef: _sourceProductRef, sku: _sku, barcode: _barcode, sourceOfTruthConnectionId: _sourceOfTruthConnectionId, originConnectionId: _originConnectionId, originExternalRef: _originExternalRef, originType: _originType, ...safeData } = body;

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
