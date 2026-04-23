import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/permissions";
import {
  getIngredient,
  unselectPlatformIngredient,
} from "@/services/owner/owner-ingredients.service";

interface Params {
  params: Promise<{ ingredientId: string }>;
}

export async function GET(_req: Request, { params }: Params) {
  const { ingredientId } = await params;
  const ctx = await requireAuth();
  const tenantId = ctx.tenantMemberships[0]?.tenantId ?? "";
  try {
    const ingredient = await getIngredient(tenantId, ingredientId);
    return NextResponse.json({ data: ingredient });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Not found";
    return NextResponse.json({ error: message }, { status: 404 });
  }
}

export async function PATCH(req: Request, { params }: Params) {
  void req;
  void params;
  return NextResponse.json(
    { error: "Owners cannot edit ingredient content" },
    { status: 405 }
  );
}

export async function DELETE(_req: Request, { params }: Params) {
  const { ingredientId } = await params;
  const ctx = await requireAuth();
  const tenantId = ctx.tenantMemberships[0]?.tenantId ?? "";
  try {
    await unselectPlatformIngredient(tenantId, ingredientId);
    return NextResponse.json({ data: { deleted: true } });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Delete failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
