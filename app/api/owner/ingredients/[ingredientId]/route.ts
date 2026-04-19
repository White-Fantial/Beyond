import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/permissions";
import {
  getIngredient,
  updateIngredient,
  deleteIngredient,
} from "@/services/owner/owner-ingredients.service";
import type { UpdateIngredientInput } from "@/types/owner-ingredients";

interface Params {
  params: { ingredientId: string };
}

export async function GET(_req: Request, { params }: Params) {
  const { ingredientId } = params;
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
  const { ingredientId } = params;
  const ctx = await requireAuth();
  const tenantId = ctx.tenantMemberships[0]?.tenantId ?? "";
  const body = (await req.json()) as UpdateIngredientInput;
  try {
    const ingredient = await updateIngredient(tenantId, ingredientId, body);
    return NextResponse.json({ data: ingredient });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Update failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  const { ingredientId } = params;
  const ctx = await requireAuth();
  const tenantId = ctx.tenantMemberships[0]?.tenantId ?? "";
  try {
    await deleteIngredient(tenantId, ingredientId);
    return NextResponse.json({ data: { deleted: true } });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Delete failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
