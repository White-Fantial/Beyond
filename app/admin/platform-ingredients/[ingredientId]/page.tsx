import { requirePlatformAdmin } from "@/lib/admin/auth-guard";
import { getPlatformIngredient } from "@/services/marketplace/platform-ingredients.service";
import { getPlatformIngredientLinks } from "@/services/admin/admin-suppliers.service";
import { INGREDIENT_UNIT_LABELS } from "@/types/owner-ingredients";
import Link from "next/link";
import { notFound } from "next/navigation";

interface Props {
  params: Promise<{ ingredientId: string }>;
}

export default async function AdminPlatformIngredientDetailPage({ params }: Props) {
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
          <h1 className="text-xl font-bold text-gray-900">{ingredient.name}</h1>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">{ingredient.name}</h2>
              {ingredient.category && (
                <span className="inline-block mt-1 text-xs font-medium px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
                  {ingredient.category}
                </span>
              )}
            </div>
            <div className="flex gap-2 shrink-0">
              <span
                className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                  ingredient.isActive
                    ? "bg-green-100 text-green-700"
                    : "bg-gray-100 text-gray-500"
                }`}
              >
                {ingredient.isActive ? "Active" : "Inactive"}
              </span>
              <Link
                href={`/admin/platform-ingredients/${ingredientId}/edit`}
                className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-700"
              >
                Edit
              </Link>
            </div>
          </div>

          <dl className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-2">
            <div>
              <dt className="text-xs font-medium text-gray-500">Unit</dt>
              <dd className="mt-0.5 text-sm text-gray-900">
                {INGREDIENT_UNIT_LABELS[ingredient.unit] ?? ingredient.unit} ({ingredient.unit})
              </dd>
            </div>
            {ingredient.description && (
              <div className="col-span-2 sm:col-span-3">
                <dt className="text-xs font-medium text-gray-500">Description</dt>
                <dd className="mt-0.5 text-sm text-gray-900">{ingredient.description}</dd>
              </div>
            )}
          </dl>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900">
              Linked Supplier Products ({links.length})
            </h2>
            <Link
              href={`/admin/platform-ingredients/${ingredientId}/edit`}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              Manage Links
            </Link>
          </div>

          {links.length === 0 ? (
            <div className="px-5 py-8 text-center text-sm text-gray-500">
              No supplier products linked yet.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-500 bg-gray-50 border-b border-gray-100">
                  <th className="px-5 py-3 text-left font-medium">Supplier Product</th>
                  <th className="px-5 py-3 text-left font-medium">Supplier</th>
                  <th className="px-5 py-3 text-right font-medium">Reference Price</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {links.map((link) => (
                  <tr key={link.id} className="hover:bg-gray-50">
                    <td className="px-5 py-3 font-medium text-gray-900">
                      {link.supplierProductName}
                    </td>
                    <td className="px-5 py-3 text-gray-600">{link.supplierName}</td>
                    <td className="px-5 py-3 text-right text-gray-700">
                      ${(link.referencePrice / 100000).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    );
  } catch {
    notFound();
  }
}
