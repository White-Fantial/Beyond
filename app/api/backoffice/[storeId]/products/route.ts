import { NextRequest, NextResponse } from "next/server";
import { requireStorePermission } from "@/lib/auth/permissions";
import { PERMISSIONS } from "@/lib/auth/constants";
import {
  createBackofficeProduct,
  getStoreTenantId,
} from "@/services/backoffice/backoffice-catalog.service";
import type { CreateProductInput } from "@/services/backoffice/backoffice-catalog.service";

export async function POST(
  req: NextRequest,
  { params }: { params: { storeId: string } }
) {
  try {
    const { storeId } = params;
    const ctx = await requireStorePermission(storeId, PERMISSIONS.MENU_MANAGE);

    const body = (await req.json()) as CreateProductInput;

    if (!body.name || typeof body.name !== "string") {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }
    if (typeof body.basePriceAmount !== "number") {
      return NextResponse.json({ error: "basePriceAmount is required" }, { status: 400 });
    }

    const tenantId = await getStoreTenantId(storeId);
    const product = await createBackofficeProduct(storeId, tenantId, ctx.userId, body);

    return NextResponse.json({ data: product }, { status: 201 });
  } catch (err) {
    console.error("[backoffice/products POST]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
