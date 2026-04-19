import { NextRequest, NextResponse } from "next/server";
import { requireOwnerStoreAccess, resolveActorTenantId } from "@/services/owner/owner-authz.service";
import {
  updateOwnerStoreBasicInfo,
  getOwnerStoreSettings,
} from "@/services/owner/owner-settings.service";

interface Params {
  params: Promise<{ storeId: string }>;
}

export async function GET(_req: NextRequest, { params }: Params) {
  const { storeId } = await params;
  try {
    await requireOwnerStoreAccess(storeId);
    const settings = await getOwnerStoreSettings(storeId);
    return NextResponse.json(settings);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 403 });
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const { storeId } = await params;
  try {
    const ctx = await requireOwnerStoreAccess(storeId);
    const tenantId = resolveActorTenantId(ctx, storeId);
    const body = await req.json();

    await updateOwnerStoreBasicInfo({
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
