import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/permissions";
import {
  createIngredientRequest,
  getUserIngredientRequests,
} from "@/services/marketplace/ingredient-requests.service";
import type { CreateIngredientRequestInput } from "@/types/marketplace";

export async function GET(req: NextRequest) {
  const ctx = await requireAuth();

  const { searchParams } = new URL(req.url);
  const page = Number(searchParams.get("page") ?? "1");
  const pageSize = Number(searchParams.get("pageSize") ?? "50");

  const result = await getUserIngredientRequests(ctx.userId, page, pageSize);
  return NextResponse.json({ data: result });
}

export async function POST(req: NextRequest) {
  const ctx = await requireAuth();

  const body = (await req.json()) as CreateIngredientRequestInput;

  if (!body.name?.trim()) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  const request = await createIngredientRequest(ctx.userId, body);
  return NextResponse.json({ data: request }, { status: 201 });
}
