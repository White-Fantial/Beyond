import { NextRequest, NextResponse } from "next/server";
import { requireOwnerStoreAccess, resolveActorTenantId } from "@/services/owner/owner-authz.service";
import { updateOwnerOperationSettings } from "@/services/owner/owner-settings.service";

interface Params {
  params: { storeId: string };
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const { storeId } = params;
  try {
    const ctx = await requireOwnerStoreAccess(storeId);
    const tenantId = resolveActorTenantId(ctx, storeId);
    const body = await req.json();

    await updateOwnerOperationSettings({
      storeId: storeId,
      tenantId,
      actorUserId: ctx.userId,
      data: body,
    });

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
