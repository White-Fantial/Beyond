import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/permissions";
import {
  updateSupplierProduct,
  deleteSupplierProduct,
} from "@/services/owner/owner-suppliers.service";
import type { UpdateSupplierProductInput } from "@/types/owner-suppliers";

interface Params {
  params: Promise<{ supplierId: string; productId: string }>;
}

export async function PATCH(req: Request, { params }: Params) {
  const { supplierId, productId } = await params;
  const ctx = await requireAuth();
  const tenantId = ctx.tenantMemberships[0]?.tenantId ?? "";
  const body = (await req.json()) as UpdateSupplierProductInput;
  try {
    const product = await updateSupplierProduct(
      tenantId,
      supplierId,
      productId,
      body
    );
    return NextResponse.json({ data: product });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Update failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  const { supplierId, productId } = await params;
  const ctx = await requireAuth();
  const tenantId = ctx.tenantMemberships[0]?.tenantId ?? "";
  try {
    await deleteSupplierProduct(tenantId, supplierId, productId);
    return NextResponse.json({ data: { deleted: true } });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Delete failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
