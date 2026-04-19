import { NextRequest, NextResponse } from "next/server";
import { getStoreBySlugForCustomer, placeGuestOrder } from "@/services/customer-menu.service";
import type { PlaceGuestOrderInput } from "@/types/storefront";

/**
 * POST /api/store/[storeSlug]/orders
 *
 * Places a guest order. No authentication required.
 * Body: PlaceGuestOrderInput (without storeId — that comes from the URL)
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ storeSlug: string }> }
) {
  try {
    const { storeSlug } = await params;

    const store = await getStoreBySlugForCustomer(storeSlug);
    if (!store) {
      return NextResponse.json({ error: "Store not found" }, { status: 404 });
    }

    const body = (await req.json()) as Omit<PlaceGuestOrderInput, "storeId">;

    if (!body.customerName || typeof body.customerName !== "string") {
      return NextResponse.json({ error: "customerName is required" }, { status: 400 });
    }
    if (!body.customerPhone || typeof body.customerPhone !== "string") {
      return NextResponse.json({ error: "customerPhone is required" }, { status: 400 });
    }
    if (!body.pickupTime || typeof body.pickupTime !== "string") {
      return NextResponse.json({ error: "pickupTime is required" }, { status: 400 });
    }
    if (!Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json({ error: "items must be a non-empty array" }, { status: 400 });
    }

    const result = await placeGuestOrder({
      ...body,
      storeId: store.id,
      currencyCode: store.currency,
    });

    return NextResponse.json({ data: result }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    const isBusiness =
      message.includes("not found") ||
      message.includes("sold out") ||
      message.includes("unavailable");
    if (isBusiness) {
      return NextResponse.json({ error: message }, { status: 422 });
    }
    console.error("[store/orders] Unexpected error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
