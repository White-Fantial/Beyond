import { requireAuth } from "@/lib/auth/permissions";
import MarketplaceRecipeSearch from "@/components/owner/marketplace/MarketplaceRecipeSearch";

/**
 * Owner — Marketplace Recipe Search
 *
 * Allows owners to search platform-provided (BASIC) and premium marketplace
 * recipes. Only PUBLISHED marketplace recipes are surfaced here.
 *
 * NOTE: Owner-registered recipes (Recipe model, tenant-scoped) are completely
 * separate from marketplace recipes and are never returned by the marketplace
 * API, so they cannot appear in this search.
 */
export default async function OwnerMarketplaceSearchPage() {
  await requireAuth();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">마켓플레이스 레시피 검색</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          플랫폼에서 제공하는 무료 레시피와 프리미엄 레시피를 검색하세요.
          마음에 드는 레시피는 레시피 라이브러리에 추가할 수 있습니다.
        </p>
      </div>
      <MarketplaceRecipeSearch />
    </div>
  );
}
