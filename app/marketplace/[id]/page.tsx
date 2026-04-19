import { requireAuth } from "@/lib/auth/permissions";
import { getMarketplaceRecipe } from "@/services/marketplace/recipe-marketplace.service";
import { checkRecipeAccess } from "@/services/marketplace/recipe-purchase.service";
import RecipeDetailView from "@/components/marketplace/RecipeDetailView";
import Link from "next/link";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function MarketplaceRecipeDetailPage({ params }: PageProps) {
  const ctx = await requireAuth();
  const { id } = await params;

  const [recipe, access] = await Promise.all([
    getMarketplaceRecipe(id),
    checkRecipeAccess(id, ctx.userId, ctx.platformRole),
  ]);

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      <div className="mb-6">
        <Link href="/marketplace" className="text-xs text-gray-400 hover:underline">
          ← 마켓플레이스
        </Link>
      </div>
      <RecipeDetailView recipe={recipe} access={access} />
    </div>
  );
}
