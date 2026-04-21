import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/permissions";
import {
  listPriceRecords,
  createManualPriceRecord,
} from "@/services/owner/owner-supplier-prices.service";
import type { CreatePriceRecordInput } from "@/types/owner-supplier-prices";

interface Params {
  params: Promise<{ productId: string }>;
}

/**
 * GET /api/owner/supplier-products/[productId]/price-records
 * List price observation records for a supplier product (newest first).
 */
export async function GET(req: NextRequest, { params }: Params) {
  const { productId } = await params;
  const ctx = await requireAuth();
  const tenantId = ctx.tenantMemberships[0]?.tenantId ?? "";
  const { searchParams } = new URL(req.url);
  const page = Number(searchParams.get("page") ?? "1");
  const pageSize = Number(searchParams.get("pageSize") ?? "30");

  try {
    const result = await listPriceRecords(tenantId, productId, { page, pageSize });
    return NextResponse.json({ data: result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Not found";
    return NextResponse.json({ error: message }, { status: 404 });
  }
}

/**
 * POST /api/owner/supplier-products/[productId]/price-records
 * Manually record a price observation for a supplier product.
 */
export async function POST(req: NextRequest, { params }: Params) {
  const { productId } = await params;
  const ctx = await requireAuth();
  const tenantId = ctx.tenantMemberships[0]?.tenantId ?? "";
  const body = (await req.json()) as CreatePriceRecordInput;

  if (body.observedPrice === undefined || body.observedPrice < 0) {
    return NextResponse.json(
      { error: "observedPrice must be a non-negative integer (millicents: 1/100000 dollar)" },
      { status: 400 }
    );
  }

  try {
    const record = await createManualPriceRecord(tenantId, productId, body);
    return NextResponse.json({ data: record }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Create failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
