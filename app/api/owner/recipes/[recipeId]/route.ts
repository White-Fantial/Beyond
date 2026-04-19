import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/permissions";
import {
  getRecipe,
  updateRecipe,
  deleteRecipe,
} from "@/services/owner/owner-recipes.service";
import type { UpdateRecipeInput } from "@/types/owner-recipes";

interface Params {
  params: Promise<{ recipeId: string }>;
}

export async function GET(_req: Request, { params }: Params) {
  const { recipeId } = await params;
  const ctx = await requireAuth();
  const tenantId = ctx.tenantMemberships[0]?.tenantId ?? "";
  try {
    const recipe = await getRecipe(tenantId, recipeId);
    return NextResponse.json({ data: recipe });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Not found";
    return NextResponse.json({ error: message }, { status: 404 });
  }
}

export async function PATCH(req: Request, { params }: Params) {
  const { recipeId } = await params;
  const ctx = await requireAuth();
  const tenantId = ctx.tenantMemberships[0]?.tenantId ?? "";
  const body = (await req.json()) as UpdateRecipeInput;
  try {
    const recipe = await updateRecipe(tenantId, recipeId, body);
    return NextResponse.json({ data: recipe });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Update failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  const { recipeId } = await params;
  const ctx = await requireAuth();
  const tenantId = ctx.tenantMemberships[0]?.tenantId ?? "";
  try {
    await deleteRecipe(tenantId, recipeId);
    return NextResponse.json({ data: { deleted: true } });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Delete failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
