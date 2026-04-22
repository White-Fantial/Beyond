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

/** Returns the recipe row if found, or null if not found / already deleted. */
async function resolveRecipe(
  recipeId: string
): Promise<{ tenantId: string | null } | null> {
  const row = await prisma.recipe.findFirst({
    where: { id: recipeId, deletedAt: null },
    select: { tenantId: true },
  });
  return row ?? null;
}

export async function GET(_req: NextRequest, { params }: Params) {
  await requirePlatformAdmin();
  const { recipeId } = await params;

  const row = await resolveRecipe(recipeId);
  if (!row) {
    return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
  }

  try {
    const recipe = await getRecipe(row.tenantId as string, recipeId);
    return NextResponse.json({ data: recipe });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Not found";
    return NextResponse.json({ error: message }, { status: 404 });
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  await requirePlatformAdmin();
  const { recipeId } = await params;

  const row = await resolveRecipe(recipeId);
  if (!row) {
    return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
  }

  const body = (await req.json()) as UpdateRecipeInput;

  try {
    const recipe = await updateRecipe(row.tenantId as string, recipeId, body);
    return NextResponse.json({ data: recipe });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Update failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  await requirePlatformAdmin();
  const { recipeId } = await params;

  const row = await resolveRecipe(recipeId);
  if (!row) {
    return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
  }

  try {
    await deleteRecipe(row.tenantId as string, recipeId);
    return NextResponse.json({ data: { deleted: true } });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Delete failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
