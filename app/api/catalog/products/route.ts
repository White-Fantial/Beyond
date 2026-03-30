import { NextRequest, NextResponse } from "next/server";
import { listCatalogProducts, updateProductMerchandising } from "@/services/catalog.service";

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
  const { productId, ...fields } = body as {
    productId: string;
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

  const updated = await updateProductMerchandising(productId, fields);
  return NextResponse.json({ product: updated });
}
