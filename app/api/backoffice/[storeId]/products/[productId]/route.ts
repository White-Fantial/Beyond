import { NextRequest, NextResponse } from "next/server";
import { requireStorePermission } from "@/lib/auth/permissions";
import { PERMISSIONS } from "@/lib/auth/constants";
import {
  updateBackofficeProduct,
  deleteBackofficeProduct,
  getStoreTenantId,
} from "@/services/backoffice/backoffice-catalog.service";
import type { UpdateProductInput } from "@/services/backoffice/backoffice-catalog.service";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ storeId: string; productId: string }> }
) {
  try {
    const { storeId, productId } = await params;
    const ctx = await requireStorePermission(storeId, PERMISSIONS.MENU_MANAGE);

    const body = (await req.json()) as UpdateProductInput;
    const tenantId = await getStoreTenantId(storeId);
    const product = await updateBackofficeProduct(storeId, tenantId, ctx.userId, productId, body);

    return NextResponse.json({ data: product });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    const status =
      message.includes("Cannot edit") ? 422 :
      message.includes("does not belong") ? 404 :
      500;
    console.error("[backoffice/products PATCH]", err);
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ storeId: string; productId: string }> }
) {
  try {
    const { storeId, productId } = await params;
    const ctx = await requireStorePermission(storeId, PERMISSIONS.MENU_MANAGE);

    const tenantId = await getStoreTenantId(storeId);
    await deleteBackofficeProduct(storeId, tenantId, ctx.userId, productId);

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    const status =
      message.includes("Cannot delete") ? 422 :
      message.includes("does not belong") ? 404 :
      500;
    console.error("[backoffice/products DELETE]", err);
    return NextResponse.json({ error: message }, { status });
  }
}
