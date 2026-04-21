import Link from "next/link";
import { requireAuth } from "@/lib/auth/permissions";
import AddIngredientForm from "@/components/owner/ingredients/AddIngredientForm";

export default async function NewIngredientPage() {
  const ctx = await requireAuth();
  const storeId = ctx.storeMemberships[0]?.storeId ?? "";

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/owner/ingredients"
          className="text-sm text-gray-500 hover:text-gray-700 transition"
        >
          ← Ingredients
        </Link>
        <span className="text-gray-300">/</span>
        <h1 className="text-xl font-bold text-gray-900">Add Ingredient</h1>
      </div>
      <AddIngredientForm storeId={storeId} />
    </div>
  );
}
