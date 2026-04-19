import { NextRequest, NextResponse } from "next/server";
import { requireOwnerStoreAccess, resolveActorTenantId } from "@/services/owner/owner-authz.service";
import { updateOwnerCategory } from "@/services/owner/owner-catalog.service";

interface Params {
  params: Promise<{ storeId: string; categoryId: string }>;
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const { storeId, categoryId } = await params;
  try {
    const ctx = await requireOwnerStoreAccess(storeId);
    const tenantId = resolveActorTenantId(ctx, storeId);
    const body = await req.json();

    // Phase 1: name and description are now editable in Beyond.
    // Strip only internal provenance fields that should never be overridden via API.
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { sourceType: _sourceType, sourceCategoryRef: _sourceCategoryRef, sourceOfTruthConnectionId: _sourceOfTruthConnectionId, originConnectionId: _originConnectionId, originExternalRef: _originExternalRef, originType: _originType, ...safeData } = body;

    await updateOwnerCategory({
      categoryId: categoryId,
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
