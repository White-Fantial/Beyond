import { requirePlatformAdmin } from "@/lib/admin/auth-guard";
import { listRecipeCategories } from "@/services/admin/admin-recipe-categories.service";
import RecipeCategoryManager from "@/components/admin/RecipeCategoryManager";

export default async function AdminRecipeCategoriesPage() {
  await requirePlatformAdmin();
  const categories = await listRecipeCategories();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Recipe Categories</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Manage platform-wide recipe categories. Categories are optional — recipes without a
          category are shown as &ldquo;Uncategorized&rdquo;.
        </p>
      </div>

      <RecipeCategoryManager initialCategories={categories} />
    </div>
  );
}
