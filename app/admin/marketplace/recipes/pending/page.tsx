import { requirePlatformAdmin } from "@/lib/admin/auth-guard";
import { listMarketplaceRecipes } from "@/services/marketplace/recipe-marketplace.service";
import PendingRecipesList from "@/components/marketplace/PendingRecipesList";
import Link from "next/link";

export default async function AdminPendingRecipesPage() {
  await requirePlatformAdmin();

  const result = await listMarketplaceRecipes({
    status: "PENDING_REVIEW",
    pageSize: 50,
  });

  return (
    <div>
      <div className="mb-6">
        <Link
          href="/admin/marketplace/recipes"
          className="text-xs text-gray-400 hover:underline"
        >
          ← 전체 레시피
        </Link>
      </div>

      <div className="flex items-center gap-3 mb-6">
        <h1 className="text-xl font-bold text-gray-900">검토 대기</h1>
        {result.total > 0 && (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
            {result.total}건
          </span>
        )}
      </div>

      <PendingRecipesList recipes={result.items} />
    </div>
  );
}
