import { requireAuth } from "@/lib/auth/permissions";
import { listMarketplaceRecipes } from "@/services/marketplace/recipe-marketplace.service";
import RecipeCard from "@/components/marketplace/RecipeCard";

export default async function MarketplacePage() {
  await requireAuth();

  const [basicResult, premiumResult] = await Promise.all([
    listMarketplaceRecipes({ type: "BASIC", status: "PUBLISHED", pageSize: 50 }),
    listMarketplaceRecipes({ type: "PREMIUM", status: "PUBLISHED", pageSize: 50 }),
  ]);

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 space-y-10">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">레시피 마켓플레이스</h1>
        <p className="text-sm text-gray-500 mt-1">
          기본 레시피와 프리미엄 레시피를 둘러보세요.
        </p>
      </div>

      {/* Basic Recipes */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <h2 className="text-lg font-semibold text-gray-800">기본 레시피</h2>
          <span className="text-xs text-green-700 bg-green-100 px-2 py-0.5 rounded-full font-medium">
            무료
          </span>
          <span className="text-xs text-gray-400">({basicResult.total})</span>
        </div>

        {basicResult.items.length === 0 ? (
          <p className="text-sm text-gray-400 py-6 text-center">
            등록된 기본 레시피가 없습니다.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {basicResult.items.map((recipe) => (
              <RecipeCard key={recipe.id} recipe={recipe} />
            ))}
          </div>
        )}
      </section>

      {/* Premium Recipes */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <h2 className="text-lg font-semibold text-gray-800">프리미엄 레시피</h2>
          <span className="text-xs text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full font-medium">
            유료
          </span>
          <span className="text-xs text-gray-400">({premiumResult.total})</span>
        </div>

        {premiumResult.items.length === 0 ? (
          <p className="text-sm text-gray-400 py-6 text-center">
            등록된 프리미엄 레시피가 없습니다.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {premiumResult.items.map((recipe) => (
              <RecipeCard key={recipe.id} recipe={recipe} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
