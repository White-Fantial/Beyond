import { requirePlatformAdmin } from "@/lib/admin/auth-guard";
import AdminCreateRecipeForm from "@/components/admin/AdminCreateRecipeForm";
import Link from "next/link";

export default async function AdminNewRecipePage() {
  await requirePlatformAdmin();

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin/recipes" className="text-sm text-gray-500 hover:text-gray-700">
          ← Recipe Management
        </Link>
        <span className="text-gray-300">/</span>
        <h1 className="text-xl font-bold text-gray-900">New Recipe</h1>
      </div>
      <AdminCreateRecipeForm pageMode />
    </div>
  );
}
