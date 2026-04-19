import type { RecipeDetail } from "@/types/owner-recipes";
import RecipeCostBreakdown from "@/components/owner/recipes/RecipeCostBreakdown";
import Link from "next/link";

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
  if (recipes.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-sm font-semibold text-gray-900 mb-1">Recipe</h2>
        <p className="text-sm text-gray-500 mb-4">
          이 상품에 연결된 레시피가 없습니다. 마켓플레이스에서 레시피를 가져오거나 직접 만드세요.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/marketplace"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition"
          >
            🏪 마켓플레이스에서 레시피 가져오기
          </Link>
          <Link
            href={`/owner/recipes?newForProduct=${productId}&storeId=${storeId}`}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-white border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition"
          >
            ✏️ 직접 레시피 만들기
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {recipes.map((recipe) => (
        <div key={recipe.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <h2 className="text-sm font-semibold text-gray-900 truncate">{recipe.name}</h2>
              <RecipeBadge recipe={recipe} />
              {recipe.marketplaceSourceId && (
                <span className="text-xs text-gray-400">
                  (마켓플레이스 원본 참조 — 수정 가능)
                </span>
              )}
            </div>
            <Link
              href={`/owner/recipes/${recipe.id}`}
              className="shrink-0 text-xs font-medium text-brand-600 hover:text-brand-800"
            >
              원가 상세 →
            </Link>
          </div>
          <div className="p-5">
            <RecipeCostBreakdown detail={recipe} />
          </div>
        </div>
      ))}
    </div>
  );
}
