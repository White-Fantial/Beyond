import { NextRequest, NextResponse } from "next/server";
import { requireStorePermission } from "@/lib/auth/permissions";
import { PERMISSIONS } from "@/lib/auth/constants";
import {
  updateBackofficeModifierGroup,
  deleteBackofficeModifierGroup,
  getStoreTenantId,
} from "@/services/backoffice/backoffice-catalog.service";
import type { UpdateModifierGroupInput } from "@/services/backoffice/backoffice-catalog.service";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { storeId: string; groupId: string } }
) {
  try {
    const { storeId, groupId } = params;
    const ctx = await requireStorePermission(storeId, PERMISSIONS.MODIFIER_MANAGE);

    const body = (await req.json()) as UpdateModifierGroupInput;
    const tenantId = await getStoreTenantId(storeId);
    const group = await updateBackofficeModifierGroup(storeId, tenantId, ctx.userId, groupId, body);

    return NextResponse.json({ data: group });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    const status =
      message.includes("Cannot edit") ? 422 :
      message.includes("does not belong") ? 404 :
      500;
    console.error("[backoffice/modifiers PATCH]", err);
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { storeId: string; groupId: string } }
) {
  try {
    const { storeId, groupId } = params;
    const ctx = await requireStorePermission(storeId, PERMISSIONS.MODIFIER_MANAGE);

    const tenantId = await getStoreTenantId(storeId);
    await deleteBackofficeModifierGroup(storeId, tenantId, ctx.userId, groupId);

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    const status =
      message.includes("Cannot delete") ? 422 :
      message.includes("does not belong") ? 404 :
      500;
    console.error("[backoffice/modifiers DELETE]", err);
    return NextResponse.json({ error: message }, { status });
  }
}
