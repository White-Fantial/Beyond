import { requireAuth } from "@/lib/auth/permissions";
import NewRecipeForm from "@/components/owner/recipes/NewRecipeForm";
import Link from "next/link";

export default async function NewOwnerRecipePage() {
  const ctx = await requireAuth();
  // requireAuth is called for auth guard only
  void ctx;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/owner/recipes" className="text-sm text-gray-500 hover:text-gray-700">
          ← Recipes
        </Link>
        <span className="text-gray-300">/</span>
        <h1 className="text-xl font-bold text-gray-900">New Recipe</h1>
      </div>
      <NewRecipeForm />
    </div>
  );
}
