import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/permissions";
import {
  listIngredients,
  createIngredient,
} from "@/services/owner/owner-ingredients.service";
import type { CreateIngredientInput } from "@/types/owner-ingredients";

export async function GET(req: NextRequest) {
  const ctx = await requireAuth();
  const tenantId = ctx.tenantMemberships[0]?.tenantId ?? "";
  const { searchParams } = new URL(req.url);
  const storeId = searchParams.get("storeId") ?? undefined;
  const page = Number(searchParams.get("page") ?? "1");
  const pageSize = Number(searchParams.get("pageSize") ?? "50");

  const result = await listIngredients(tenantId, { storeId, page, pageSize });
  return NextResponse.json({ data: result });
}

export async function POST(req: NextRequest) {
  const ctx = await requireAuth();
  const tenantId = ctx.tenantMemberships[0]?.tenantId ?? "";
  const body = (await req.json()) as CreateIngredientInput;

  if (!body.storeId) {
    return NextResponse.json({ error: "storeId is required" }, { status: 400 });
  }
  if (!body.name?.trim()) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }
  if (!body.unit) {
    return NextResponse.json({ error: "unit is required" }, { status: 400 });
  }

  const ingredient = await createIngredient(tenantId, body);
  return NextResponse.json({ data: ingredient }, { status: 201 });
}
