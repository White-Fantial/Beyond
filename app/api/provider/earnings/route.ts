import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/permissions";
import {
  listEarnings,
  getEarningsSummary,
} from "@/services/provider/provider-earnings.service";
import type { RecipePayoutStatus } from "@/types/provider-onboarding";

export async function GET(req: NextRequest) {
  const ctx = await requireAuth();

  if (!ctx.isRecipeProvider && !ctx.isPlatformAdmin) {
    return NextResponse.json({ error: "Not a recipe provider" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const summaryOnly = searchParams.get("summary") === "true";
  const payoutStatus = searchParams.get("payoutStatus") as RecipePayoutStatus | null;
  const page = parseInt(searchParams.get("page") ?? "1", 10);
  const pageSize = parseInt(searchParams.get("pageSize") ?? "20", 10);

  if (summaryOnly) {
    const summary = await getEarningsSummary(ctx.userId);
    return NextResponse.json({ data: summary });
  }

  const result = await listEarnings(ctx.userId, {
    payoutStatus: payoutStatus ?? undefined,
    page,
    pageSize,
  });

  return NextResponse.json({ data: result });
}
