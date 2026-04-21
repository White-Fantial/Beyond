import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/permissions";
import { getSupplierDetail } from "@/services/owner/owner-suppliers.service";

interface Params {
  params: Promise<{ supplierId: string }>;
}

export async function GET(_req: Request, { params }: Params) {
  const { supplierId } = await params;
  const ctx = await requireAuth();
  const tenantId = ctx.tenantMemberships[0]?.tenantId ?? "";
  try {
    const supplier = await getSupplierDetail(tenantId, supplierId);
    return NextResponse.json({ data: supplier });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Not found";
    return NextResponse.json({ error: message }, { status: 404 });
  }
}
