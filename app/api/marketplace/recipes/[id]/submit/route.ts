import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/permissions";
import { submitRecipeForReview } from "@/services/marketplace/recipe-moderation.service";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(_req: NextRequest, { params }: RouteContext) {
  const ctx = await requireAuth();
  const { id } = await params;

  if (!ctx.isRecipeProvider) {
    return NextResponse.json(
      { error: "Only RECIPE_PROVIDER users can submit recipes for review" },
      { status: 403 }
    );
  }

  await submitRecipeForReview(id, ctx.userId);
  return NextResponse.json({ success: true });
}
