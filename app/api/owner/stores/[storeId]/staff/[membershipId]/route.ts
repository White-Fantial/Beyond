import { NextRequest, NextResponse } from "next/server";
import { requireOwnerStoreAccess, resolveActorTenantId } from "@/services/owner/owner-authz.service";
import {
  updateOwnerStoreStaffRole,
  toggleOwnerStoreStaffStatus,
  removeOwnerStoreStaff,
} from "@/services/owner/owner-staff.service";

interface Params {
  params: { storeId: string; membershipId: string };
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const { storeId, membershipId } = params;
  try {
    const ctx = await requireOwnerStoreAccess(storeId);
    const tenantId = resolveActorTenantId(ctx, storeId);
    const body = await req.json();

    if (body.newRole !== undefined) {
      await updateOwnerStoreStaffRole({
        storeMembershipId: membershipId,
        storeId: storeId,
        tenantId,
        actorUserId: ctx.userId,
        newRole: body.newRole,
      });
    } else if (body.activate !== undefined) {
      await toggleOwnerStoreStaffStatus({
        storeMembershipId: membershipId,
        storeId: storeId,
        tenantId,
        actorUserId: ctx.userId,
        activate: body.activate,
      });
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    const status = message === "LAST_OWNER_DEMOTION_BLOCKED" ? 409 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { storeId, membershipId } = params;
  try {
    const ctx = await requireOwnerStoreAccess(storeId);
    const tenantId = resolveActorTenantId(ctx, storeId);

    await removeOwnerStoreStaff({
      storeMembershipId: membershipId,
      storeId: storeId,
      tenantId,
      actorUserId: ctx.userId,
    });

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    const status = message === "LAST_OWNER_DEMOTION_BLOCKED" ? 409 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
