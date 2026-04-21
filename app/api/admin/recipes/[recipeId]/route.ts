import { NextRequest, NextResponse } from "next/server";
import { requirePlatformAdmin } from "@/lib/admin/auth-guard";
import { prisma } from "@/lib/prisma";
import {
  getRecipe,
  updateRecipe,
  deleteRecipe,
} from "@/services/owner/owner-recipes.service";
import type { UpdateRecipeInput } from "@/types/owner-recipes";

interface Params {
  params: Promise<{ recipeId: string }>;
}

async function resolveTenantId(recipeId: string): Promise<string | null> {
  const row = await prisma.recipe.findFirst({
    where: { id: recipeId, deletedAt: null },
    select: { tenantId: true },
  });
  return row?.tenantId ?? null;
}

export async function GET(_req: NextRequest, { params }: Params) {
  await requirePlatformAdmin();
  const { recipeId } = await params;

  const tenantId = await resolveTenantId(recipeId);
  if (!tenantId) {
    return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
  }

  try {
    const recipe = await getRecipe(tenantId, recipeId);
    return NextResponse.json({ data: recipe });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Not found";
    return NextResponse.json({ error: message }, { status: 404 });
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  await requirePlatformAdmin();
  const { recipeId } = await params;

  const tenantId = await resolveTenantId(recipeId);
  if (!tenantId) {
    return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
  }

  const body = (await req.json()) as UpdateRecipeInput;

  try {
    const recipe = await updateRecipe(tenantId, recipeId, body);
    return NextResponse.json({ data: recipe });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Update failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  await requirePlatformAdmin();
  const { recipeId } = await params;

  const tenantId = await resolveTenantId(recipeId);
  if (!tenantId) {
    return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
  }

  try {
    await deleteRecipe(tenantId, recipeId);
    return NextResponse.json({ data: { deleted: true } });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Delete failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
