import { NextRequest, NextResponse } from "next/server";
import { requireOwnerStoreAccess, resolveActorTenantId } from "@/services/owner/owner-authz.service";
import {
  getOwnerStoreSettings,
  updateOwnerOperationSettings,
} from "@/services/owner/owner-settings.service";

interface Params {
  params: { storeId: string };
}

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    await requireOwnerStoreAccess(params.storeId);
    const settings = await getOwnerStoreSettings(params.storeId);
    return NextResponse.json(settings.operationSettings);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 403 });
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const ctx = await requireOwnerStoreAccess(params.storeId);
    const tenantId = resolveActorTenantId(ctx, params.storeId);
    const body = await req.json();

    await updateOwnerOperationSettings({
      storeId: params.storeId,
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
