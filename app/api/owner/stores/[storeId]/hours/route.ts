import { NextRequest, NextResponse } from "next/server";
import { requireOwnerStoreAccess, resolveActorTenantId } from "@/services/owner/owner-authz.service";
import { updateOwnerStoreHours } from "@/services/owner/owner-settings.service";

interface Params {
  params: { storeId: string };
}

export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const ctx = await requireOwnerStoreAccess(params.storeId);
    const tenantId = resolveActorTenantId(ctx, params.storeId);
    const body = await req.json();

    if (!Array.isArray(body.hours)) {
      return NextResponse.json({ error: "hours array required" }, { status: 400 });
    }

    await updateOwnerStoreHours({
      storeId: params.storeId,
      tenantId,
      actorUserId: ctx.userId,
      hours: body.hours,
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
