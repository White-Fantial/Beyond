import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/permissions";
import { endContractPrice } from "@/services/owner/owner-supplier-prices.service";

interface Params {
  params: Promise<{ productId: string; contractPriceId: string }>;
}

/**
 * DELETE /api/owner/supplier-products/[productId]/contract-prices/[contractPriceId]
 * End (close) an active contract price by setting effectiveTo = now.
 */
export async function DELETE(_req: NextRequest, { params }: Params) {
  const { contractPriceId } = await params;
  const ctx = await requireAuth();
  const tenantId = ctx.tenantMemberships[0]?.tenantId ?? "";

  try {
    const updated = await endContractPrice(tenantId, contractPriceId);
    return NextResponse.json({ data: updated });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Not found";
    return NextResponse.json({ error: message }, { status: 404 });
  }
}
