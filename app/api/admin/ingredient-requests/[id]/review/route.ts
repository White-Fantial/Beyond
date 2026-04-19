import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserAuthContext } from "@/lib/auth/context";
import { reviewIngredientRequest } from "@/services/marketplace/ingredient-requests.service";
import type { ReviewIngredientRequestInput } from "@/types/marketplace";

interface RouteContext {
  params: { id: string };
}

export async function PUT(req: NextRequest, { params }: RouteContext) {
  const ctx = await getCurrentUserAuthContext();
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!ctx.isPlatformAdmin && !ctx.isPlatformModerator) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = params;
  const body = (await req.json()) as ReviewIngredientRequestInput;

  if (!body.status || !["APPROVED", "REJECTED", "DUPLICATE"].includes(body.status)) {
    return NextResponse.json(
      { error: "status must be one of APPROVED, REJECTED, DUPLICATE" },
      { status: 400 }
    );
  }

  try {
    const result = await reviewIngredientRequest(id, ctx.userId, body);
    return NextResponse.json({ data: result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Review failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
