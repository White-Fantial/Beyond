import { NextRequest, NextResponse } from "next/server";
import { requireStorePermission } from "@/lib/auth/permissions";
import { PERMISSIONS } from "@/lib/auth/constants";
import {
  updateBackofficeCategory,
  getStoreTenantId,
} from "@/services/backoffice/backoffice-catalog.service";
import type { UpdateCategoryInput } from "@/services/backoffice/backoffice-catalog.service";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ storeId: string; categoryId: string }> }
) {
  try {
    const { storeId, categoryId } = await params;
    const ctx = await requireStorePermission(storeId, PERMISSIONS.INVENTORY);

    const body = (await req.json()) as UpdateCategoryInput;
    const tenantId = await getStoreTenantId(storeId);
    const category = await updateBackofficeCategory(storeId, tenantId, ctx.userId, categoryId, body);

    return NextResponse.json({ data: category });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    const status =
      message.includes("Cannot edit") ? 422 :
      message.includes("does not belong") ? 404 :
      500;
    console.error("[backoffice/catalog/categories/:categoryId PATCH]", err);
    return NextResponse.json({ error: message }, { status });
  }
}
