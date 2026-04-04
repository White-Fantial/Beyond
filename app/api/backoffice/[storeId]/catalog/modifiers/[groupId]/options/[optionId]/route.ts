import { NextRequest, NextResponse } from "next/server";
import { requireStorePermission } from "@/lib/auth/permissions";
import { PERMISSIONS } from "@/lib/auth/constants";
import {
  updateBackofficeModifierOption,
  getStoreTenantId,
} from "@/services/backoffice/backoffice-catalog.service";
import type { UpdateModifierOptionInput } from "@/services/backoffice/backoffice-catalog.service";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ storeId: string; groupId: string; optionId: string }> }
) {
  try {
    const { storeId, optionId } = await params;
    const ctx = await requireStorePermission(storeId, PERMISSIONS.INVENTORY);

    const body = (await req.json()) as UpdateModifierOptionInput;
    const tenantId = await getStoreTenantId(storeId);
    const option = await updateBackofficeModifierOption(storeId, tenantId, ctx.userId, optionId, body);

    return NextResponse.json({ data: option });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    const status =
      message.includes("Cannot edit") ? 422 :
      message.includes("does not belong") ? 404 :
      500;
    console.error("[backoffice/catalog/modifiers/:groupId/options/:optionId PATCH]", err);
    return NextResponse.json({ error: message }, { status });
  }
}
