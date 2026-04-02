import { NextRequest, NextResponse } from "next/server";
import { requireOwnerStoreAccess, resolveActorTenantId } from "@/services/owner/owner-authz.service";
import { listOwnerStoreStaff, inviteOwnerStoreStaff } from "@/services/owner/owner-staff.service";

interface Params {
  params: { storeId: string };
}

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const ctx = await requireOwnerStoreAccess(params.storeId);
    const tenantId = resolveActorTenantId(ctx, params.storeId);
    const staff = await listOwnerStoreStaff(params.storeId, tenantId);
    return NextResponse.json(staff);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 403 });
  }
}

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const ctx = await requireOwnerStoreAccess(params.storeId);
    const tenantId = resolveActorTenantId(ctx, params.storeId);
    const body = await req.json();

    if (!body.email || !body.storeRole) {
      return NextResponse.json({ error: "email and storeRole required" }, { status: 400 });
    }

    await inviteOwnerStoreStaff({
      storeId: params.storeId,
      tenantId,
      actorUserId: ctx.userId,
      email: body.email,
      name: body.name,
      storeRole: body.storeRole,
    });

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
