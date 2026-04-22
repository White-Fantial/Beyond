import { requirePlatformAdmin } from "@/lib/admin/auth-guard";
import { getPlatformIngredient } from "@/services/marketplace/platform-ingredients.service";
import { getPlatformIngredientLinks } from "@/services/admin/admin-suppliers.service";
import Link from "next/link";
import { notFound } from "next/navigation";
import AdminIngredientEditForm from "./AdminIngredientEditForm";

interface Props {
  params: Promise<{ ingredientId: string }>;
}

export default async function AdminPlatformIngredientEditPage({ params }: Props) {
  await requirePlatformAdmin();
  const { ingredientId } = await params;

  try {
    const [ingredient, links] = await Promise.all([
      getPlatformIngredient(ingredientId),
      getPlatformIngredientLinks(ingredientId),
    ]);

    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/platform-ingredients"
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            ← Platform Ingredients
          </Link>
          <span className="text-gray-300">/</span>
          <Link
            href={`/admin/platform-ingredients/${ingredientId}`}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            {ingredient.name}
          </Link>
          <span className="text-gray-300">/</span>
          <span className="text-gray-800 font-medium">Edit</span>
        </div>
        <AdminIngredientEditForm ingredient={ingredient} initialLinks={links} />
      </div>
    );
  } catch {
    notFound();
  }
}
