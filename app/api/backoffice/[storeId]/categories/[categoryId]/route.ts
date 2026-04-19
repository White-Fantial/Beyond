import { NextRequest, NextResponse } from "next/server";
import { requireStorePermission } from "@/lib/auth/permissions";
import { PERMISSIONS } from "@/lib/auth/constants";
import {
  updateBackofficeCategory,
  deleteBackofficeCategory,
  getStoreTenantId,
} from "@/services/backoffice/backoffice-catalog.service";
import type { UpdateCategoryInput } from "@/services/backoffice/backoffice-catalog.service";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { storeId: string; categoryId: string } }
) {
  try {
    const { storeId, categoryId } = params;
    const ctx = await requireStorePermission(storeId, PERMISSIONS.CATEGORY_MANAGE);

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
    console.error("[backoffice/categories PATCH]", err);
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { storeId: string; categoryId: string } }
) {
  try {
    const { storeId, categoryId } = params;
    const ctx = await requireStorePermission(storeId, PERMISSIONS.CATEGORY_MANAGE);

    const tenantId = await getStoreTenantId(storeId);
    await deleteBackofficeCategory(storeId, tenantId, ctx.userId, categoryId);

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    const status =
      message.includes("Cannot delete") ? 422 :
      message.includes("does not belong") ? 404 :
      500;
    console.error("[backoffice/categories DELETE]", err);
    return NextResponse.json({ error: message }, { status });
  }
}
