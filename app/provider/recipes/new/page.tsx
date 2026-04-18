import { requireAuth } from "@/lib/auth/permissions";
import { redirect } from "next/navigation";
import { listPlatformIngredients } from "@/services/marketplace/platform-ingredients.service";
import RecipeForm from "@/components/provider/RecipeForm";
import Link from "next/link";

export default async function NewProviderRecipePage() {
  const ctx = await requireAuth();

  if (!ctx.isRecipeProvider) {
    redirect("/unauthorized");
  }

  const ingredientsResult = await listPlatformIngredients({
    isActive: true,
    pageSize: 200,
  });

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      <div className="mb-6">
        <Link href="/provider/recipes" className="text-xs text-gray-400 hover:underline">
          ← 내 레시피
        </Link>
      </div>

      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">새 레시피 등록</h1>
        <p className="text-sm text-gray-500 mt-1">
          프리미엄 레시피를 작성하고 검토 제출하세요.
        </p>
      </div>

      <RecipeForm
        mode="create"
        platformIngredients={ingredientsResult.items}
      />
    </div>
  );
}
