import type { RecipeDetail } from "@/types/owner-recipes";
import RecipeCostBreakdown from "@/components/owner/recipes/RecipeCostBreakdown";
import ProductRecipeActions from "@/components/owner/products/ProductRecipeActions";

interface Props {
  storeId: string;
  productId: string;
  recipes: RecipeDetail[];
}

function RecipeBadge({ recipe }: { recipe: RecipeDetail }) {
  if (recipe.marketplaceSourceId) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
        🏪 Platform Recipe
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700">
      ✏️ Custom Recipe
    </span>
  );
}

export default function ProductRecipePanel({ storeId, productId, recipes }: Props) {
  return (
    <div className="space-y-6">
      {recipes.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-1">Recipe</h2>
          <p className="text-sm text-gray-500">
            No recipe is linked to this product yet. Search the marketplace to import one, or create your own from scratch.
          </p>
          <ProductRecipeActions storeId={storeId} productId={productId} />
        </div>
      ) : (
        <>
          {recipes.map((recipe) => (
            <div key={recipe.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <h2 className="text-sm font-semibold text-gray-900 truncate">{recipe.name}</h2>
                  <RecipeBadge recipe={recipe} />
                  {recipe.marketplaceSourceId && (
                    <span className="text-xs text-gray-400">
                      (copied from marketplace — fully editable)
                    </span>
                  )}
                </div>
              </div>
              <div className="p-5">
                <RecipeCostBreakdown detail={recipe} canEdit />
              </div>
            </div>
          ))}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs font-medium text-gray-500 mb-2">Add another recipe</p>
            <ProductRecipeActions storeId={storeId} productId={productId} />
          </div>
        </>
      )}
    </div>
  );
}
