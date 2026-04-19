import type { Ingredient } from "@/types/owner-ingredients";
import { INGREDIENT_UNIT_LABELS } from "@/types/owner-ingredients";
import Link from "next/link";

interface Props {
  items: Ingredient[];
}

function formatCost(minor: number, currency: string) {
  return `${(minor / 100).toFixed(2)} ${currency}`;
}

export default function IngredientTable({ items }: Props) {
  if (items.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-sm text-gray-500">
        No ingredients yet. Add one above.
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
              <th className="px-5 py-3 text-left font-medium">Unit</th>
              <th className="px-5 py-3 text-right font-medium">Unit Cost (ex-GST)</th>
              <th className="px-5 py-3 text-left font-medium">Notes</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {items.map((item) => (
              <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-5 py-3 font-medium text-gray-900">{item.name}</td>
                <td className="px-5 py-3 text-gray-600">
                  {INGREDIENT_UNIT_LABELS[item.unit] ?? item.unit}
                </td>
                <td className="px-5 py-3 text-right text-gray-700">
                  {formatCost(item.unitCost, item.currency)}
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
