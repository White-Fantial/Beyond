import Link from "next/link";
import type { Ingredient } from "@/types/owner-ingredients";
import { INGREDIENT_UNIT_LABELS } from "@/types/owner-ingredients";

interface Props {
  items: Ingredient[];
  /** IDs of temp (STORE-scope) ingredients that have a pending approval request */
  pendingTempIds?: Set<string>;
}

export default function IngredientTable({ items, pendingTempIds }: Props) {
  if (items.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-sm text-gray-500">
        No ingredients yet. Click &quot;Request Ingredient&quot; to get started.
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-gray-500 bg-gray-50 border-b border-gray-100">
              <th className="px-5 py-3 text-left font-medium">Name</th>
              <th className="px-5 py-3 text-left font-medium">Category</th>
              <th className="px-5 py-3 text-left font-medium">Recipe Unit</th>
              <th className="px-5 py-3 text-left font-medium">Notes</th>
              <th className="px-5 py-3 text-left font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {items.map((item) => {
              const isPending = pendingTempIds?.has(item.id) ?? false;
              return (
                <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3 font-medium">
                    <Link href={`/owner/ingredients/${item.id}`} className="text-brand-700 hover:text-brand-900 hover:underline">
                      {item.name}
                    </Link>
                  </td>
                  <td className="px-5 py-3">
                    {item.category ? (
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
                        {item.category}
                      </span>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-gray-600">
                    {INGREDIENT_UNIT_LABELS[item.unit] ?? item.unit}
                  </td>
                  <td className="px-5 py-3 text-gray-500 truncate max-w-xs">
                    {item.notes ?? "—"}
                  </td>
                  <td className="px-5 py-3">
                    {isPending ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                        Pending Approval
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

