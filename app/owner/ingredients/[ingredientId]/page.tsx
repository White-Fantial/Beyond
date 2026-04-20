import { notFound } from "next/navigation";
import Link from "next/link";
import { requireAuth } from "@/lib/auth/permissions";
import { getIngredient } from "@/services/owner/owner-ingredients.service";
import EditIngredientForm from "@/components/owner/ingredients/EditIngredientForm";

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
    </div>
  );
}
