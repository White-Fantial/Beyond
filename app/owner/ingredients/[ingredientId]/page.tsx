import { notFound } from "next/navigation";
import Link from "next/link";
import { requireAuth } from "@/lib/auth/permissions";
import { getIngredient } from "@/services/owner/owner-ingredients.service";
import { getIngredientLinks } from "@/services/owner/owner-suppliers.service";
import EditIngredientForm from "@/components/owner/ingredients/EditIngredientForm";
import IngredientSupplierLinkPanel from "@/components/owner/ingredients/IngredientSupplierLinkPanel";

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
      <EditIngredientForm ingredient={ingredient} />
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <IngredientSupplierLinkPanel
          ingredientId={ingredientId}
          initialLinks={links}
        />
      </div>
    </div>
  );
}
