"use client";

import type { MarketplaceRecipe } from "@/types/marketplace";
import { MARKETPLACE_RECIPE_STATUS_LABELS } from "@/types/marketplace";
import Link from "next/link";

interface ProviderRecipeListProps {
  recipes: MarketplaceRecipe[];
}

const statusColors: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-600",
  PENDING_REVIEW: "bg-blue-100 text-blue-700",
  CHANGE_REQUESTED: "bg-yellow-100 text-yellow-700",
  APPROVED: "bg-teal-100 text-teal-700",
  PUBLISHED: "bg-green-100 text-green-700",
  REJECTED: "bg-red-100 text-red-700",
  ARCHIVED: "bg-gray-100 text-gray-400",
};

export default function ProviderRecipeList({ recipes }: ProviderRecipeListProps) {
  if (recipes.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400">
        <p className="text-4xl mb-3">📝</p>
        <p className="text-sm">No recipes yet. Create your first one!</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      <table className="min-w-full divide-y divide-gray-200 text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left font-medium text-gray-500">Recipe</th>
            <th className="px-4 py-3 text-left font-medium text-gray-500">Status</th>
            <th className="px-4 py-3 text-left font-medium text-gray-500 hidden sm:table-cell">Sale Price</th>
            <th className="px-4 py-3 text-left font-medium text-gray-500 hidden md:table-cell">Created</th>
            <th className="px-4 py-3"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 bg-white">
          {recipes.map((r) => (
            <tr key={r.id} className="hover:bg-gray-50">
              <td className="px-4 py-3">
                <Link href={`/marketplace/${r.id}`} className="font-medium text-blue-600 hover:underline">
                  {r.title}
                </Link>
                {r.cuisineTag && (
                  <p className="text-xs text-gray-400">{r.cuisineTag}</p>
                )}
              </td>
              <td className="px-4 py-3">
                <span
                  className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                    statusColors[r.status] ?? "bg-gray-100 text-gray-600"
                  }`}
                >
                  {MARKETPLACE_RECIPE_STATUS_LABELS[r.status]}
                </span>
              </td>
              <td className="px-4 py-3 text-gray-600 hidden sm:table-cell">
                {r.salePrice.toLocaleString("en-US", { style: "currency", currency: "USD" })}
              </td>
              <td className="px-4 py-3 text-gray-400 text-xs hidden md:table-cell">
                {new Date(r.createdAt).toLocaleDateString("en-US")}
              </td>
              <td className="px-4 py-3 text-right">
                {(r.status === "DRAFT" || r.status === "CHANGE_REQUESTED") && (
                  <Link
                    href={`/provider/recipes/${r.id}/edit`}
                    className="text-xs text-blue-600 hover:underline mr-3"
                  >
                    Edit
                  </Link>
                )}
                <Link
                  href={`/marketplace/${r.id}`}
                  className="text-xs text-gray-500 hover:underline"
                >
                  View
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
