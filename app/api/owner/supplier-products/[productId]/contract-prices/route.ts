import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/permissions";
import {
  listContractPrices,
  createContractPrice,
} from "@/services/owner/owner-supplier-prices.service";
import type { CreateContractPriceInput } from "@/types/owner-supplier-prices";

interface Params {
  params: Promise<{ productId: string }>;
}

/**
 * GET /api/owner/supplier-products/[productId]/contract-prices
 * List all contract prices (active and historical) for a supplier product.
 */
export async function GET(_req: NextRequest, { params }: Params) {
  const { productId } = await params;
  const ctx = await requireAuth();
  const tenantId = ctx.tenantMemberships[0]?.tenantId ?? "";

  try {
    const result = await listContractPrices(tenantId, productId);
    return NextResponse.json({ data: result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Not found";
    return NextResponse.json({ error: message }, { status: 404 });
  }
}

/**
 * POST /api/owner/supplier-products/[productId]/contract-prices
 * Create a new contract price, automatically ending the currently active one.
 */
export async function POST(req: NextRequest, { params }: Params) {
  const { productId } = await params;
  const ctx = await requireAuth();
  const tenantId = ctx.tenantMemberships[0]?.tenantId ?? "";
  const body = (await req.json()) as CreateContractPriceInput;

  if (body.price === undefined || body.price < 0) {
    return NextResponse.json(
      { error: "price must be a non-negative integer (millicents: 1/100000 dollar)" },
      { status: 400 }
    );
  }

  try {
    const contractPrice = await createContractPrice(tenantId, productId, body);
    return NextResponse.json({ data: contractPrice }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Create failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
