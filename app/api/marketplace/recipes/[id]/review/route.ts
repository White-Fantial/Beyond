import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/permissions";
import { reviewRecipe } from "@/services/marketplace/recipe-moderation.service";
import type { ReviewActionInput } from "@/types/marketplace";

interface RouteContext {
  params: { id: string };
}

export async function POST(req: NextRequest, { params }: RouteContext) {
  const ctx = await requireAuth();
  const { id } = params;

  if (!ctx.isPlatformAdmin && !ctx.isPlatformModerator) {
    return NextResponse.json(
      { error: "Only admins and moderators can review recipes" },
      { status: 403 }
    );
  }

  const body = (await req.json()) as ReviewActionInput;
  if (!body.action) {
    return NextResponse.json(
      { error: "action is required" },
      { status: 400 }
    );
  }

  const review = await reviewRecipe(id, ctx.userId, body);
  return NextResponse.json({ data: review });
}
