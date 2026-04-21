import { requireAuth } from "@/lib/auth/permissions";
import { redirect } from "next/navigation";
import {
  getMarketplaceRecipe,
} from "@/services/marketplace/recipe-marketplace.service";
import { listPlatformIngredients } from "@/services/marketplace/platform-ingredients.service";
import RecipeForm from "@/components/provider/RecipeForm";
import Link from "next/link";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditProviderRecipePage({ params }: PageProps) {
  const ctx = await requireAuth();
  const { id } = await params;

  if (!ctx.isRecipeProvider && !ctx.isPlatformAdmin && !ctx.isPlatformModerator) {
    redirect("/unauthorized");
  }

  const [recipe, ingredientsResult] = await Promise.all([
    getMarketplaceRecipe(id),
    listPlatformIngredients({ isActive: true, pageSize: 200 }),
  ]);

  // Provider can only edit their own recipe in editable states
  if (ctx.isRecipeProvider && !ctx.isPlatformAdmin && !ctx.isPlatformModerator) {
    if (recipe.providerId !== ctx.userId) redirect("/unauthorized");
    const editableStatuses = ["DRAFT", "CHANGE_REQUESTED"];
    if (!editableStatuses.includes(recipe.status)) redirect("/provider/recipes");
  }

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      <div className="mb-6">
        <Link href="/provider/recipes" className="text-xs text-gray-400 hover:underline">
          ← My Recipes
        </Link>
      </div>

      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Edit Recipe</h1>
        {recipe.status === "CHANGE_REQUESTED" && (
          <div className="mt-2 bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800">
            ⚠️ A moderator has requested changes. Please revise and submit for review.
          </div>
        )}
      </div>

      <RecipeForm
        mode="edit"
        initial={recipe}
        platformIngredients={ingredientsResult.items}
        recipeId={id}
      />
    </div>
  );
}
