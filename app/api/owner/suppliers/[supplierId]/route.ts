import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/permissions";
import {
  getSupplierDetail,
  updateSupplier,
  deleteSupplier,
} from "@/services/owner/owner-suppliers.service";
import type { UpdateSupplierInput } from "@/types/owner-suppliers";

interface Params {
  params: { supplierId: string };
}

export async function GET(_req: Request, { params }: Params) {
  const ctx = await requireAuth();
  const tenantId = ctx.tenantMemberships[0]?.tenantId ?? "";
  try {
    const supplier = await getSupplierDetail(tenantId, params.supplierId);
    return NextResponse.json({ data: supplier });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Not found";
    return NextResponse.json({ error: message }, { status: 404 });
  }
}

export async function PATCH(req: Request, { params }: Params) {
  const ctx = await requireAuth();
  const tenantId = ctx.tenantMemberships[0]?.tenantId ?? "";
  const body = (await req.json()) as UpdateSupplierInput;
  try {
    const supplier = await updateSupplier(tenantId, params.supplierId, body);
    return NextResponse.json({ data: supplier });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Update failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  const ctx = await requireAuth();
  const tenantId = ctx.tenantMemberships[0]?.tenantId ?? "";
  try {
    await deleteSupplier(tenantId, params.supplierId);
    return NextResponse.json({ data: { deleted: true } });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Delete failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
