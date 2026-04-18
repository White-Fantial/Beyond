import type { Recipe } from "@/types/owner-recipes";
import { RECIPE_YIELD_UNIT_LABELS } from "@/types/owner-recipes";
import Link from "next/link";

interface Props {
  items: Recipe[];
}

function formatCost(minor: number) {
  return `$${(minor / 100).toFixed(2)}`;
}

export default function RecipeTable({ items }: Props) {
  if (items.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-sm text-gray-500">
        No recipes yet. Create one above.
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-gray-500 bg-gray-50 border-b border-gray-100">
              <th className="px-5 py-3 text-left font-medium">Recipe</th>
              <th className="px-5 py-3 text-left font-medium">Product</th>
              <th className="px-5 py-3 text-left font-medium">Yield</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {items.map((recipe) => (
              <tr key={recipe.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-5 py-3 font-medium text-gray-900">{recipe.name}</td>
                <td className="px-5 py-3 text-gray-600">
                  {recipe.catalogProductName ? (
                    <span>
                      {recipe.catalogProductName}
                      {recipe.catalogProductPrice !== null && (
                        <span className="ml-1 text-gray-400">
                          ({formatCost(recipe.catalogProductPrice)})
                        </span>
                      )}
                    </span>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </td>
                <td className="px-5 py-3 text-gray-600">
                  {recipe.yieldQty} {RECIPE_YIELD_UNIT_LABELS[recipe.yieldUnit]}
                </td>
                <td className="px-5 py-3 text-right">
                  <Link
                    href={`/owner/recipes/${recipe.id}`}
                    className="text-brand-600 hover:text-brand-800 text-xs font-medium"
                  >
                    View
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
