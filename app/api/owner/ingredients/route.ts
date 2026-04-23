import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/permissions";
import {
  listIngredients,
  selectPlatformIngredient,
} from "@/services/owner/owner-ingredients.service";

export async function GET(req: NextRequest) {
  const ctx = await requireAuth();
  const tenantId = ctx.tenantMemberships[0]?.tenantId ?? "";
  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category") ?? undefined;
  const isActiveParam = searchParams.get("isActive");
  const isActive = isActiveParam === null ? undefined : isActiveParam === "true";
  const page = Number(searchParams.get("page") ?? "1");
  const pageSize = Number(searchParams.get("pageSize") ?? "50");

  const result = await listIngredients(tenantId, { category, isActive, page, pageSize });
  return NextResponse.json({ data: result });
}

export async function POST(req: NextRequest) {
  const ctx = await requireAuth();
  const tenantId = ctx.tenantMemberships[0]?.tenantId ?? "";
  const body = (await req.json()) as { ingredientId?: string; platformIngredientId?: string };
  const ingredientId = body.ingredientId ?? body.platformIngredientId;

  if (!ingredientId?.trim()) {
    return NextResponse.json({ error: "ingredientId is required" }, { status: 400 });
  }

  const ingredient = await selectPlatformIngredient(tenantId, ingredientId.trim());
  return NextResponse.json({ data: ingredient }, { status: 201 });
}
