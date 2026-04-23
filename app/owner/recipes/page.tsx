import { requireAuth } from "@/lib/auth/permissions";
import { listRecipes } from "@/services/owner/owner-recipes.service";
import RecipeTable from "@/components/owner/recipes/RecipeTable";
import Link from "next/link";

export default async function OwnerRecipesPage() {
  const ctx = await requireAuth();
  const tenantId = ctx.tenantMemberships[0]?.tenantId ?? "";

  const result = await listRecipes(tenantId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Recipes</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {result.total} recipe{result.total !== 1 ? "s" : ""}
          </p>
        </div>
        <Link
          href="/owner/recipes/new"
          className="px-4 py-2 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 transition"
        >
          + New Recipe
        </Link>
      </div>
      <RecipeTable items={result.items} />
    </div>
  );
}
