import Link from "next/link";
import { requireAuth } from "@/lib/auth/permissions";
import { listIngredients } from "@/services/owner/owner-ingredients.service";
import IngredientTable from "@/components/owner/ingredients/IngredientTable";
import ImportPlatformIngredientPanel from "@/components/owner/ingredients/ImportPlatformIngredientPanel";

export default async function OwnerIngredientsPage() {
  const ctx = await requireAuth();
  const tenantId = ctx.tenantMemberships[0]?.tenantId ?? "";
  // Use the first store as default for now; storeId can be driven by query params in future
  const storeId = ctx.storeMemberships[0]?.storeId ?? "";

  const result = await listIngredients(tenantId, { storeId });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Ingredients</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {result.total} ingredient{result.total !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <ImportPlatformIngredientPanel storeId={storeId} />
          <Link
            href="/owner/ingredients/new"
            className="px-4 py-2 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 transition"
          >
            + Add Ingredient
          </Link>
        </div>
      </div>
      <IngredientTable items={result.items} />
    </div>
  );
}
