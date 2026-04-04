import { NextRequest, NextResponse } from "next/server";
import { requireStorePermission } from "@/lib/auth/permissions";
import { PERMISSIONS } from "@/lib/auth/constants";
import {
  createBackofficeCategory,
  getStoreTenantId,
} from "@/services/backoffice/backoffice-catalog.service";
import type { CreateCategoryInput } from "@/services/backoffice/backoffice-catalog.service";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ storeId: string }> }
) {
  try {
    const { storeId } = await params;
    const ctx = await requireStorePermission(storeId, PERMISSIONS.CATEGORY_MANAGE);

    const body = (await req.json()) as CreateCategoryInput;

    if (!body.name || typeof body.name !== "string") {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }

    const tenantId = await getStoreTenantId(storeId);
    const category = await createBackofficeCategory(storeId, tenantId, ctx.userId, body);

    return NextResponse.json({ data: category }, { status: 201 });
  } catch (err) {
    console.error("[backoffice/categories POST]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
