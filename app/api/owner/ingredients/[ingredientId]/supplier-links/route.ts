import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/permissions";
import {
  getIngredientLinks,
  linkIngredientToSupplierProduct,
} from "@/services/owner/owner-suppliers.service";

interface Params {
  params: { ingredientId: string };
}

export async function GET(_req: Request, { params }: Params) {
  const ctx = await requireAuth();
  const tenantId = ctx.tenantMemberships[0]?.tenantId ?? "";
  try {
    const links = await getIngredientLinks(tenantId, params.ingredientId);
    return NextResponse.json({ data: links });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Not found";
    return NextResponse.json({ error: message }, { status: 404 });
  }
}

export async function POST(req: Request, { params }: Params) {
  const ctx = await requireAuth();
  const tenantId = ctx.tenantMemberships[0]?.tenantId ?? "";
  const body = (await req.json()) as {
    supplierProductId: string;
    isPreferred?: boolean;
  };

  if (!body.supplierProductId) {
    return NextResponse.json(
      { error: "supplierProductId is required" },
      { status: 400 }
    );
  }

  try {
    const link = await linkIngredientToSupplierProduct(
      tenantId,
      params.ingredientId,
      body.supplierProductId,
      body.isPreferred ?? false
    );
    return NextResponse.json({ data: link }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Link failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
