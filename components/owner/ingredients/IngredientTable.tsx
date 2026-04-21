import type { Ingredient } from "@/types/owner-ingredients";
import { INGREDIENT_UNIT_LABELS } from "@/types/owner-ingredients";
import Link from "next/link";

interface Props {
  items: Ingredient[];
}

function formatCost(minor: number) {
  return `$${(minor / 100000).toFixed(6)}`;
}

export default function IngredientTable({ items }: Props) {
  if (items.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-sm text-gray-500">
        No ingredients yet. Click &quot;Add Ingredient&quot; to get started.
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
              <th className="px-5 py-3 text-left font-medium">Purchase Unit</th>
              <th className="px-5 py-3 text-left font-medium">Recipe Unit</th>
              <th className="px-5 py-3 text-right font-medium">Unit Cost (ex-GST)</th>
              <th className="px-5 py-3 text-left font-medium">Notes</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {items.map((item) => (
              <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-5 py-3 font-medium text-gray-900">{item.name}</td>
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
                  {INGREDIENT_UNIT_LABELS[item.purchaseUnit] ?? item.purchaseUnit}
                </td>
                <td className="px-5 py-3 text-gray-600">
                  {INGREDIENT_UNIT_LABELS[item.unit] ?? item.unit}
                </td>
                <td className="px-5 py-3 text-right text-gray-700">
                  {formatCost(item.unitCost)}&nbsp;/&nbsp;
                  {INGREDIENT_UNIT_LABELS[item.unit] ?? item.unit}
                </td>
                <td className="px-5 py-3 text-gray-500 truncate max-w-xs">
                  {item.notes ?? "—"}
                </td>
                <td className="px-5 py-3 text-right">
                  <Link
                    href={`/owner/ingredients/${item.id}`}
                    className="text-brand-600 hover:text-brand-800 text-xs font-medium"
                  >
                    Edit
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
