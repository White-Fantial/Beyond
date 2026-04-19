import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/permissions";
import { checkRecipeAccess } from "@/services/marketplace/recipe-purchase.service";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_req: NextRequest, { params }: RouteContext) {
  const ctx = await requireAuth();
  const { id } = await params;

  const result = await checkRecipeAccess(id, ctx.userId, ctx.platformRole);
  return NextResponse.json({ data: result });
}
