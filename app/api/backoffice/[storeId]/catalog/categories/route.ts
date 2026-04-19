import { NextRequest, NextResponse } from "next/server";
import { requireStorePermission } from "@/lib/auth/permissions";
import { PERMISSIONS } from "@/lib/auth/constants";
import {
  reorderCategories,
  getStoreTenantId,
} from "@/services/backoffice/backoffice-catalog.service";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: { storeId: string } }
) {
  try {
    const { storeId } = params;
    await requireStorePermission(storeId, PERMISSIONS.INVENTORY);

    const categories = await prisma.catalogCategory.findMany({
      where: { storeId, deletedAt: null },
      orderBy: { displayOrder: "asc" },
      select: { id: true, name: true, displayOrder: true },
    });

    return NextResponse.json({ categories });
  } catch (err) {
    console.error("[backoffice/catalog/categories GET]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { storeId: string } }
) {
  try {
    const { storeId } = params;
    const ctx = await requireStorePermission(storeId, PERMISSIONS.INVENTORY);

    const body = (await req.json()) as { items: { id: string; displayOrder: number }[] };

    if (!Array.isArray(body.items)) {
      return NextResponse.json({ error: "items is required" }, { status: 400 });
    }

    const tenantId = await getStoreTenantId(storeId);
    await reorderCategories(storeId, tenantId, ctx.userId, body.items);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[backoffice/catalog/categories PATCH]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
