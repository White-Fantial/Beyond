import { NextRequest, NextResponse } from "next/server";
import { getStoreBySlugForCustomer } from "@/services/customer-menu.service";
import { validateGiftCard } from "@/services/owner/owner-gift-cards.service";

/**
 * POST /api/store/[storeSlug]/gift-card/validate
 * Validates a gift card code without redeeming it.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { storeSlug: string } }
) {
  const { storeSlug } = params;
  try {
    const store = await getStoreBySlugForCustomer(storeSlug);
    if (!store) return NextResponse.json({ error: "Store not found" }, { status: 404 });

    const { code, orderAmountMinor } = (await req.json()) as {
      code: string;
      orderAmountMinor: number;
    };

    if (!code || typeof code !== "string") {
      return NextResponse.json({ error: "code is required" }, { status: 400 });
    }
    if (typeof orderAmountMinor !== "number" || orderAmountMinor <= 0) {
      return NextResponse.json({ error: "orderAmountMinor must be a positive number" }, { status: 400 });
    }

    const result = await validateGiftCard(store.tenantId, code, orderAmountMinor);
    return NextResponse.json({ data: result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid gift card";
    return NextResponse.json({ error: message }, { status: 422 });
  }
}
