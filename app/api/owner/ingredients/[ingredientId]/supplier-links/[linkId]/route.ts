import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/permissions";
import { unlinkIngredientFromSupplierProduct } from "@/services/owner/owner-suppliers.service";

interface Params {
  params: { ingredientId: string; linkId: string };
}

export async function DELETE(_req: Request, { params }: Params) {
  const ctx = await requireAuth();
  const tenantId = ctx.tenantMemberships[0]?.tenantId ?? "";
  try {
    await unlinkIngredientFromSupplierProduct(tenantId, params.linkId);
    return NextResponse.json({ data: { deleted: true } });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Delete failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
