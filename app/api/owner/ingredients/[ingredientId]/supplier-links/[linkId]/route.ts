import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/permissions";
import { unlinkIngredientFromSupplierProduct, setLinkPreferred } from "@/services/owner/owner-suppliers.service";

interface Params {
  params: Promise<{ ingredientId: string; linkId: string }>;
}

export async function PATCH(req: Request, { params }: Params) {
  const { linkId } = await params;
  const ctx = await requireAuth();
  const tenantId = ctx.tenantMemberships[0]?.tenantId ?? "";
  const body = (await req.json()) as { isPreferred?: boolean };

  if (body.isPreferred === undefined) {
    return NextResponse.json({ error: "isPreferred is required" }, { status: 400 });
  }

  try {
    const link = await setLinkPreferred(tenantId, linkId, body.isPreferred);
    return NextResponse.json({ data: link });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Update failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  const { linkId } = await params;
  const ctx = await requireAuth();
  const tenantId = ctx.tenantMemberships[0]?.tenantId ?? "";
  try {
    await unlinkIngredientFromSupplierProduct(tenantId, linkId);
    return NextResponse.json({ data: { deleted: true } });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Delete failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
