import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserAuthContext } from "@/lib/auth/context";
import { listIngredientRequests } from "@/services/marketplace/ingredient-requests.service";
import type { IngredientRequestFilters, IngredientRequestStatus } from "@/types/marketplace";

export async function GET(req: NextRequest) {
  const ctx = await getCurrentUserAuthContext();
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!ctx.isPlatformAdmin && !ctx.isPlatformModerator) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const filters: IngredientRequestFilters = {
    status: (searchParams.get("status") as IngredientRequestStatus) ?? undefined,
    requestedByUserId: searchParams.get("requestedByUserId") ?? undefined,
    page: Number(searchParams.get("page") ?? "1"),
    pageSize: Number(searchParams.get("pageSize") ?? "50"),
  };

  const result = await listIngredientRequests(filters);
  return NextResponse.json({ data: result });
}
