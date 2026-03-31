import { NextRequest, NextResponse } from "next/server";
import { listCatalogProducts, updateProductMerchandising, setProductSoldOut } from "@/services/catalog.service";

export async function GET(req: NextRequest) {
  const storeId = req.nextUrl.searchParams.get("storeId");
  if (!storeId) {
    return NextResponse.json({ error: "storeId is required" }, { status: 400 });
  }

  const categoryId = req.nextUrl.searchParams.get("categoryId") ?? undefined;
  const activeOnly = req.nextUrl.searchParams.get("activeOnly") !== "false";

  const products = await listCatalogProducts(storeId, { categoryId, activeOnly });
  return NextResponse.json({ products });
}

export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const { action, productId, isSoldOut, ...fields } = body as {
    action?: "toggleSoldOut";
    productId: string;
    isSoldOut?: boolean;
    displayOrder?: number;
    isVisibleOnOnlineOrder?: boolean;
    isVisibleOnSubscription?: boolean;
    isFeatured?: boolean;
    onlineName?: string;
    subscriptionName?: string;
    internalNote?: string;
    imageUrl?: string;
  };

  if (!productId) {
    return NextResponse.json({ error: "productId is required" }, { status: 400 });
  }

  if (action === "toggleSoldOut") {
    if (isSoldOut === undefined) {
      return NextResponse.json({ error: "isSoldOut is required" }, { status: 400 });
    }
    const updated = await setProductSoldOut(productId, isSoldOut);
    return NextResponse.json({ product: updated });
  }

  const updated = await updateProductMerchandising(productId, fields);
  return NextResponse.json({ product: updated });
}
