import { NextRequest, NextResponse } from "next/server";
import { listCatalogCategories, reorderCategories, updateCategoryMerchandising } from "@/services/catalog.service";

export async function GET(req: NextRequest) {
  const storeId = req.nextUrl.searchParams.get("storeId");
  if (!storeId) {
    return NextResponse.json({ error: "storeId is required" }, { status: 400 });
  }

  const activeOnly = req.nextUrl.searchParams.get("activeOnly") !== "false";
  const categories = await listCatalogCategories(storeId, { activeOnly });
  return NextResponse.json({ categories });
}

export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const { action, categoryId, storeId, orderedIds, ...fields } = body as {
    action: "reorder" | "update";
    categoryId?: string;
    storeId?: string;
    orderedIds?: string[];
    displayOrder?: number;
    isVisibleOnOnlineOrder?: boolean;
    isVisibleOnSubscription?: boolean;
    imageUrl?: string;
  };

  if (action === "reorder") {
    if (!storeId || !Array.isArray(orderedIds)) {
      return NextResponse.json({ error: "storeId and orderedIds required" }, { status: 400 });
    }
    await reorderCategories(storeId, orderedIds);
    return NextResponse.json({ ok: true });
  }

  if (action === "update") {
    if (!categoryId) {
      return NextResponse.json({ error: "categoryId required" }, { status: 400 });
    }
    const updated = await updateCategoryMerchandising(categoryId, fields);
    return NextResponse.json({ category: updated });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
