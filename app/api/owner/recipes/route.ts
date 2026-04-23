import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/permissions";
import {
  listRecipes,
  createRecipe,
} from "@/services/owner/owner-recipes.service";
import type { CreateRecipeInput } from "@/types/owner-recipes";

export async function GET(req: NextRequest) {
  const ctx = await requireAuth();
  const tenantId = ctx.tenantMemberships[0]?.tenantId ?? "";
  const { searchParams } = new URL(req.url);
  const page = Number(searchParams.get("page") ?? "1");
  const pageSize = Number(searchParams.get("pageSize") ?? "20");

  const result = await listRecipes(tenantId, { page, pageSize });
  return NextResponse.json({ data: result });
}

export async function POST(req: NextRequest) {
  const ctx = await requireAuth();
  const tenantId = ctx.tenantMemberships[0]?.tenantId ?? "";
  const body = (await req.json()) as CreateRecipeInput;

  if (!body.name?.trim()) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }
  if (!body.yieldQty || body.yieldQty < 1) {
    return NextResponse.json({ error: "yieldQty must be at least 1" }, { status: 400 });
  }

  try {
    const recipe = await createRecipe(tenantId, body);
    return NextResponse.json({ data: recipe }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Create failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
