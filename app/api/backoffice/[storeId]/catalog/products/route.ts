import { NextRequest, NextResponse } from "next/server";
import { requireStorePermission } from "@/lib/auth/permissions";
import { PERMISSIONS } from "@/lib/auth/constants";
import {
  bulkRestoreAvailability,
  getStoreTenantId,
} from "@/services/backoffice/backoffice-catalog.service";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ storeId: string }> }
) {
  try {
    const { storeId } = await params;
    await requireStorePermission(storeId, PERMISSIONS.INVENTORY);

    const categories = await prisma.catalogCategory.findMany({
      where: { storeId, deletedAt: null },
      include: {
        productCategories: {
          where: { product: { deletedAt: null } },
          orderBy: { sortOrder: "asc" },
          include: { product: true },
        },
      },
      orderBy: { displayOrder: "asc" },
    });

    const categoriesWithProducts = categories.map((c) => ({
      ...c,
      products: c.productCategories.map((pc) => pc.product),
    }));

    return NextResponse.json({ categories: categoriesWithProducts });
  } catch (err) {
    console.error("[backoffice/catalog/products GET]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ storeId: string }> }
) {
  try {
    const { storeId } = await params;
    const ctx = await requireStorePermission(storeId, PERMISSIONS.INVENTORY);

    const body = (await req.json()) as { action?: string };

    if (body.action === "bulkRestore") {
      const tenantId = await getStoreTenantId(storeId);
      const restoredCount = await bulkRestoreAvailability(storeId, tenantId, ctx.userId);
      return NextResponse.json({ restoredCount });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err) {
    console.error("[backoffice/catalog/products PATCH]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
