import { requireAuth } from "@/lib/auth/permissions";
import { listRecipes } from "@/services/owner/owner-recipes.service";
import RecipeTable from "@/components/owner/recipes/RecipeTable";
import CreateRecipeForm from "@/components/owner/recipes/CreateRecipeForm";

export default async function OwnerRecipesPage() {
  const ctx = await requireAuth();
  const tenantId = ctx.tenantMemberships[0]?.tenantId ?? "";
  const storeId = ctx.storeMemberships[0]?.storeId ?? "";

  const result = await listRecipes(tenantId, { storeId });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Recipes</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {result.total} recipe{result.total !== 1 ? "s" : ""}
          </p>
        </div>
      </div>
      <CreateRecipeForm storeId={storeId} />
      <RecipeTable items={result.items} />
    </div>
  );
}
