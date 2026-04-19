import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validatePromoCode } from "@/services/customer-menu.service";

/**
 * POST /api/store/[storeSlug]/promo/validate
 *
 * Validates a promo code for the given store WITHOUT redeeming it.
 * Body: { code: string, orderAmountMinor: number }
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ storeSlug: string }> }
) {
  try {
    const { storeSlug } = await params;

    const store = await prisma.store.findFirst({
      where: { code: storeSlug, status: "ACTIVE" },
      select: { id: true, tenantId: true },
    });
    if (!store) {
      return NextResponse.json({ error: "Store not found" }, { status: 404 });
    }

    const body = (await req.json()) as { code?: unknown; orderAmountMinor?: unknown };

    if (!body.code || typeof body.code !== "string") {
      return NextResponse.json({ error: "code is required" }, { status: 400 });
    }
    if (typeof body.orderAmountMinor !== "number" || body.orderAmountMinor < 0) {
      return NextResponse.json(
        { error: "orderAmountMinor must be a non-negative number" },
        { status: 400 }
      );
    }

    const result = await validatePromoCode(store.tenantId, body.code, body.orderAmountMinor);

    return NextResponse.json({ data: result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid promo code";
    return NextResponse.json({ error: message }, { status: 422 });
  }
}
