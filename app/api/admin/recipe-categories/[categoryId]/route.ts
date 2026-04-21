import { NextRequest, NextResponse } from "next/server";
import { requirePlatformAdmin } from "@/lib/admin/auth-guard";
import {
  updateRecipeCategory,
  deleteRecipeCategory,
} from "@/services/admin/admin-recipe-categories.service";

interface Params {
  params: Promise<{ categoryId: string }>;
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const ctx = await requirePlatformAdmin();
  const { categoryId } = await params;
  const body = (await req.json()) as { name?: string; displayOrder?: number };

  try {
    const category = await updateRecipeCategory(categoryId, ctx.userId, {
      name: body.name,
      displayOrder: body.displayOrder,
    });
    return NextResponse.json({ data: category });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update category";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const ctx = await requirePlatformAdmin();
  const { categoryId } = await params;

  try {
    await deleteRecipeCategory(categoryId, ctx.userId);
    return NextResponse.json({ data: { deleted: true } });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to delete category";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
