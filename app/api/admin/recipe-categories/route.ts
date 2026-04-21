import { NextRequest, NextResponse } from "next/server";
import { requirePlatformAdmin } from "@/lib/admin/auth-guard";
import {
  listRecipeCategories,
  createRecipeCategory,
} from "@/services/admin/admin-recipe-categories.service";

export async function GET() {
  await requirePlatformAdmin();
  const categories = await listRecipeCategories();
  return NextResponse.json({ data: categories });
}

export async function POST(req: NextRequest) {
  const ctx = await requirePlatformAdmin();
  const body = (await req.json()) as { name?: string; displayOrder?: number };

  if (!body.name?.trim()) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  try {
    const category = await createRecipeCategory(
      ctx.userId,
      body.name.trim(),
      body.displayOrder ?? 0
    );
    return NextResponse.json({ data: category }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create category";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
