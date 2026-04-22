import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/permissions";
import {
  createIngredientRequest,
  getTenantIngredientRequests,
} from "@/services/marketplace/ingredient-requests.service";
import type { CreateIngredientRequestInput } from "@/types/marketplace";

export async function GET(req: NextRequest) {
  const ctx = await requireAuth();
  const tenantId = ctx.tenantMemberships[0]?.tenantId ?? "";

  const { searchParams } = new URL(req.url);
  const page = Number(searchParams.get("page") ?? "1");
  const pageSize = Number(searchParams.get("pageSize") ?? "50");

  const result = await getTenantIngredientRequests(tenantId, page, pageSize);
  return NextResponse.json({ data: result });
}

export async function POST(req: NextRequest) {
  const ctx = await requireAuth();
  const tenantId = ctx.tenantMemberships[0]?.tenantId ?? "";

  const body = (await req.json()) as CreateIngredientRequestInput;

  if (!body.name?.trim()) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }
  if (!body.unit) {
    return NextResponse.json({ error: "unit is required" }, { status: 400 });
  }

  try {
    const request = await createIngredientRequest(ctx.userId, {
      ...body,
      tenantId,
    });
    return NextResponse.json({ data: request }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to submit request";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
