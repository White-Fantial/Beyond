import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/permissions";
import { publishRecipe } from "@/services/marketplace/recipe-moderation.service";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(req: NextRequest, { params }: RouteContext) {
  const ctx = await requireAuth();
  const { id } = await params;

  if (!ctx.isPlatformAdmin && !ctx.isPlatformModerator) {
    return NextResponse.json(
      { error: "Only admins and moderators can publish recipes" },
      { status: 403 }
    );
  }

  const body = (await req.json().catch(() => ({}))) as { notes?: string };
  const review = await publishRecipe(id, ctx.userId, body.notes);
  return NextResponse.json({ data: review });
}
