import { NextRequest, NextResponse } from "next/server";
import { requireOwnerStoreAccess, resolveActorTenantId } from "@/services/owner/owner-authz.service";
import { updateOwnerCategory } from "@/services/owner/owner-catalog.service";

interface Params {
  params: { storeId: string; categoryId: string };
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const ctx = await requireOwnerStoreAccess(params.storeId);
    const tenantId = resolveActorTenantId(ctx, params.storeId);
    const body = await req.json();

    // Strip source-locked fields
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { name: _name, sourceType: _sourceType, sourceCategoryRef: _sourceCategoryRef, sourceOfTruthConnectionId: _sourceOfTruthConnectionId, ...safeData } = body;

    await updateOwnerCategory({
      categoryId: params.categoryId,
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
