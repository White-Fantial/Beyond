import { requireAuth } from "@/lib/auth/permissions";
import { redirect } from "next/navigation";
import { listMarketplaceRecipes } from "@/services/marketplace/recipe-marketplace.service";
import ProviderRecipeList from "@/components/provider/ProviderRecipeList";
import Link from "next/link";

export default async function ProviderRecipesPage() {
  const ctx = await requireAuth();

  if (!ctx.isRecipeProvider && !ctx.isPlatformAdmin) {
    redirect("/unauthorized");
  }

  const result = await listMarketplaceRecipes({
    providerId: ctx.isRecipeProvider ? ctx.userId : undefined,
    pageSize: 100,
  });

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">My Recipes</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {result.total} {result.total === 1 ? "recipe" : "recipes"}
          </p>
        </div>
        <Link
          href="/provider/recipes/new"
          className="bg-orange-600 hover:bg-orange-700 text-white text-sm font-medium px-4 py-2 rounded-lg"
        >
          + New Recipe
        </Link>
      </div>

      <ProviderRecipeList recipes={result.items} />
    </div>
  );
}
