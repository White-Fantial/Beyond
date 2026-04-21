import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/permissions";
import { searchPlatformIngredients } from "@/services/owner/owner-ingredients.service";

/**
 * GET /api/owner/platform-ingredients
 *
 * Search PLATFORM-scope ingredients so owners can find and import them.
 * Query params: q (keyword), category, page, pageSize.
 */
export async function GET(req: NextRequest) {
  await requireAuth();
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") ?? undefined;
  const category = searchParams.get("category") ?? undefined;
  const page = Number(searchParams.get("page") ?? "1");
  const pageSize = Number(searchParams.get("pageSize") ?? "30");

  const result = await searchPlatformIngredients({ q, category, page, pageSize });
  return NextResponse.json({ data: result });
}
