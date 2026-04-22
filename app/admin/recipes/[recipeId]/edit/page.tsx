import { notFound } from "next/navigation";
import Link from "next/link";
import { requirePlatformAdmin } from "@/lib/admin/auth-guard";
import { prisma } from "@/lib/prisma";
import AdminEditRecipeForm from "@/components/admin/AdminEditRecipeForm";

interface PageProps {
  params: Promise<{ recipeId: string }>;
}

export default async function AdminEditRecipePage({ params }: PageProps) {
  await requirePlatformAdmin();
  const { recipeId } = await params;

  const recipe = await prisma.recipe.findFirst({
    where: { id: recipeId, deletedAt: null },
    include: {
      ingredients: {
        select: {
          ingredientId: true,
          quantity: true,
          unit: true,
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!recipe) notFound();

  const [platformIngredients, categories] = await Promise.all([
    prisma.ingredient.findMany({
      where: { scope: "PLATFORM", deletedAt: null },
      select: { id: true, name: true, unit: true, category: true },
      orderBy: { name: "asc" },
    }),
    prisma.recipeCategory.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  const initialRecipe = {
    id: recipe.id,
    name: recipe.name,
    yieldQty: recipe.yieldQty,
    yieldUnit: recipe.yieldUnit,
    notes: recipe.notes,
    instructions: recipe.instructions,
    categoryId: recipe.categoryId,
    ingredients: recipe.ingredients.map((i) => ({
      ingredientId: i.ingredientId,
      quantity: Number(i.quantity),
      unit: i.unit,
    })),
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/admin/recipes"
          className="text-sm text-gray-500 hover:text-gray-700 transition"
        >
          ← Recipes
        </Link>
        <h1 className="text-xl font-bold text-gray-900">Edit Recipe</h1>
      </div>

      <AdminEditRecipeForm
        recipe={initialRecipe}
        platformIngredients={platformIngredients.map((i) => ({
          id: i.id,
          name: i.name,
          unit: i.unit,
          category: i.category,
        }))}
        categories={categories}
      />
    </div>
  );
}
