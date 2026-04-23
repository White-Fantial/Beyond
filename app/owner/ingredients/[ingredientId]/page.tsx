import { notFound } from "next/navigation";
import Link from "next/link";
import { requireAuth } from "@/lib/auth/permissions";
import { getIngredient } from "@/services/owner/owner-ingredients.service";
import { getIngredientLinks } from "@/services/owner/owner-suppliers.service";
import IngredientSupplierLinkPanel from "@/components/owner/ingredients/IngredientSupplierLinkPanel";
import { INGREDIENT_UNIT_LABELS } from "@/types/owner-ingredients";

interface Props {
  params: Promise<{ ingredientId: string }>;
}

export default async function EditIngredientPage({ params }: Props) {
  const { ingredientId } = await params;
  const ctx = await requireAuth();
  const tenantId = ctx.tenantMemberships[0]?.tenantId ?? "";

  let ingredient;
  try {
    ingredient = await getIngredient(tenantId, ingredientId);
  } catch {
    notFound();
  }

  let links: import("@/types/owner-suppliers").IngredientSupplierLink[];
  try {
    links = await getIngredientLinks(tenantId, ingredientId);
  } catch {
    links = [];
  }

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
        <h1 className="text-xl font-bold text-gray-900">{ingredient.name}</h1>
      </div>
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <p className="text-xs text-gray-500 mb-4">
          Ingredients are platform-managed. Owners can view and use selected ingredients,
          but cannot edit ingredient content.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-xs text-gray-500">Name</p>
            <p className="font-medium text-gray-900">{ingredient.name}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Category</p>
            <p className="text-gray-900">{ingredient.category ?? "—"}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Recipe Unit</p>
            <p className="text-gray-900">{INGREDIENT_UNIT_LABELS[ingredient.unit] ?? ingredient.unit}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Status</p>
            <p className="text-gray-900">{ingredient.isActive ? "Active" : "Inactive"}</p>
          </div>
          <div className="sm:col-span-2">
            <p className="text-xs text-gray-500">Notes</p>
            <p className="text-gray-900">{ingredient.notes ?? "—"}</p>
          </div>
        </div>
      </div>
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <IngredientSupplierLinkPanel
          ingredientId={ingredientId}
          initialLinks={links}
        />
      </div>
    </div>
  );
}
