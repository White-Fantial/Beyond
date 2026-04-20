import { requireAuth } from "@/lib/auth/permissions";
import { getRecipe } from "@/services/owner/owner-recipes.service";
import RecipeCostBreakdown from "@/components/owner/recipes/RecipeCostBreakdown";
import { notFound } from "next/navigation";
import Link from "next/link";

interface Props {
  params: Promise<{ recipeId: string }>;
}

export default async function RecipeDetailPage({ params }: Props) {
  const { recipeId } = await params;
  const ctx = await requireAuth();
  const tenantId = ctx.tenantMemberships[0]?.tenantId ?? "";
  try {
    const detail = await getRecipe(tenantId, recipeId);
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Link
            href="/owner/recipes"
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            ← Recipes
          </Link>
          <span className="text-gray-300">/</span>
          <h1 className="text-xl font-bold text-gray-900">{detail.name}</h1>
          {detail.catalogProductName && (
            <span className="text-sm text-gray-500">
              — {detail.catalogProductName}
            </span>
          )}
        </div>
        <RecipeCostBreakdown detail={detail} canEdit />
      </div>
    );
  } catch {
    notFound();
  }
}
