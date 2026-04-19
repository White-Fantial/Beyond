import { NextRequest, NextResponse } from "next/server";
import { requireOwnerStoreAccess, resolveActorTenantId } from "@/services/owner/owner-authz.service";
import { getOwnerProduct, updateOwnerProduct } from "@/services/owner/owner-catalog.service";
import { getProductRecipes } from "@/services/owner/owner-recipes.service";

interface Params {
  params: Promise<{ storeId: string; productId: string }>;
}

export async function GET(_req: NextRequest, { params }: Params) {
  const { storeId, productId } = await params;
  try {
    await requireOwnerStoreAccess(storeId);
    const product = await getOwnerProduct(storeId, productId);
    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }
    const recipes = await getProductRecipes(storeId, productId);
    return NextResponse.json({ data: { product, recipes } });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const { storeId, productId } = await params;
  try {
    const ctx = await requireOwnerStoreAccess(storeId);
    const tenantId = resolveActorTenantId(ctx, storeId);
    const body = await req.json();

    // Phase 1: name, basePriceAmount, and description are now editable in Beyond.
    // Strip only internal provenance fields that should never be overridden via API.
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { sourceType: _sourceType, sourceProductRef: _sourceProductRef, sku: _sku, barcode: _barcode, sourceOfTruthConnectionId: _sourceOfTruthConnectionId, originConnectionId: _originConnectionId, originExternalRef: _originExternalRef, originType: _originType, ...safeData } = body;

    await updateOwnerProduct({
      productId: productId,
      storeId: storeId,
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
