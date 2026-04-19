import { NextRequest, NextResponse } from "next/server";
import { getStoreBySlugForCustomer, getProductDetailForOrdering } from "@/services/customer-menu.service";

interface RouteParams {
  params: Promise<{ storeSlug: string; productId: string }>;
}

/**
 * GET /api/store/[storeSlug]/product/[productId]
 *
 * Returns product detail including modifier groups for the ordering modal.
 * Public endpoint — no authentication required.
 */
export async function GET(
  _request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  const { storeSlug, productId } = await params;

  const store = await getStoreBySlugForCustomer(storeSlug);
  if (!store) {
    return NextResponse.json({ error: "Store not found" }, { status: 404 });
  }

  const product = await getProductDetailForOrdering(productId, store.id);
  if (!product) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  return NextResponse.json({ product });
}
