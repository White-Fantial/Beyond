import type { Ingredient } from "@/types/owner-ingredients";
import { INGREDIENT_UNIT_LABELS } from "@/types/owner-ingredients";
import Link from "next/link";

interface Props {
  items: Ingredient[];
}

function formatCost(minor: number, currency: string) {
  return `${(minor / 100000).toFixed(6)} ${currency}`;
}

export default function IngredientTable({ items }: Props) {
  if (items.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-sm text-gray-500">
        재료가 없습니다. 위에서 추가해주세요.
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-gray-500 bg-gray-50 border-b border-gray-100">
              <th className="px-5 py-3 text-left font-medium">이름</th>
              <th className="px-5 py-3 text-left font-medium">구매 단위</th>
              <th className="px-5 py-3 text-left font-medium">레시피 단위</th>
              <th className="px-5 py-3 text-right font-medium">Unit Cost (ex-GST)</th>
              <th className="px-5 py-3 text-left font-medium">메모</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {items.map((item) => (
              <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-5 py-3 font-medium text-gray-900">{item.name}</td>
                <td className="px-5 py-3 text-gray-600">
                  {INGREDIENT_UNIT_LABELS[item.purchaseUnit] ?? item.purchaseUnit}
                </td>
                <td className="px-5 py-3 text-gray-600">
                  {INGREDIENT_UNIT_LABELS[item.unit] ?? item.unit}
                </td>
                <td className="px-5 py-3 text-right text-gray-700">
                  {formatCost(item.unitCost, item.currency)}&nbsp;/&nbsp;
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
                    편집
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
