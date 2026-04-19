import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/permissions";
import {
  listSupplierProducts,
  createSupplierProduct,
} from "@/services/owner/owner-suppliers.service";
import type { UpsertSupplierProductInput } from "@/types/owner-suppliers";

interface Params {
  params: { supplierId: string };
}

export async function GET(_req: Request, { params }: Params) {
  const { supplierId } = params;
  const ctx = await requireAuth();
  const tenantId = ctx.tenantMemberships[0]?.tenantId ?? "";
  try {
    const products = await listSupplierProducts(tenantId, supplierId);
    return NextResponse.json({ data: products });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Not found";
    return NextResponse.json({ error: message }, { status: 404 });
  }
}

export async function POST(req: Request, { params }: Params) {
  const { supplierId } = params;
  const ctx = await requireAuth();
  const tenantId = ctx.tenantMemberships[0]?.tenantId ?? "";
  const body = (await req.json()) as UpsertSupplierProductInput;

  if (!body.name?.trim()) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }
  if (body.currentPrice === undefined || body.currentPrice < 0) {
    return NextResponse.json(
      { error: "currentPrice must be a non-negative integer (minor units)" },
      { status: 400 }
    );
  }

  try {
    const product = await createSupplierProduct(tenantId, supplierId, body);
    return NextResponse.json({ data: product }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Create failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
