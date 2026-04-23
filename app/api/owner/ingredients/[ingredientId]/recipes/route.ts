import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/permissions";
import { getRecipesByIngredient } from "@/services/marketplace/ingredient-requests.service";

interface Params {
  params: Promise<{ ingredientId: string }>;
}

/**
 * GET /api/owner/ingredients/[ingredientId]/recipes
 *
 * Returns recipes (scoped to the current tenant) that reference the given ingredient.
 * Used to help owners identify which recipes need manual updating after a rejected
 * ingredient request where no replacement was suggested.
 */
export async function GET(_req: Request, { params }: Params) {
  const { ingredientId } = await params;
  const ctx = await requireAuth();
  const tenantId = ctx.tenantMemberships[0]?.tenantId ?? "";
  if (!tenantId) {
    return NextResponse.json({ error: "No tenant membership found" }, { status: 403 });
  }

  try {
    const recipes = await getRecipesByIngredient(tenantId, ingredientId);
    return NextResponse.json({ data: recipes });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch recipes";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
