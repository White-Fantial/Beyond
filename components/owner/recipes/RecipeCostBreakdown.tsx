import type { RecipeDetail } from "@/types/owner-recipes";
import { INGREDIENT_UNIT_LABELS } from "@/types/owner-ingredients";
import { RECIPE_YIELD_UNIT_LABELS } from "@/types/owner-recipes";

interface Props {
  detail: RecipeDetail;
}

function formatCost(minor: number) {
  return `$${(minor / 100).toFixed(4)}`;
}

function formatCostRounded(minor: number) {
  return `$${(minor / 100).toFixed(2)}`;
}

export default function RecipeCostBreakdown({ detail }: Props) {
  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-xs text-gray-500 mb-1">Yield</div>
          <div className="text-lg font-bold text-gray-900">
            {detail.yieldQty} {RECIPE_YIELD_UNIT_LABELS[detail.yieldUnit]}
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-xs text-gray-500 mb-1">Total Cost</div>
          <div className="text-lg font-bold text-gray-900">
            {formatCostRounded(detail.totalCost)}
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-xs text-gray-500 mb-1">Cost / Unit</div>
          <div className="text-lg font-bold text-gray-900">
            {formatCost(detail.costPerUnit)}
          </div>
        </div>
        {detail.marginPercent !== null && (
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="text-xs text-gray-500 mb-1">Margin</div>
            <div
              className={`text-lg font-bold ${
                detail.marginPercent >= 0 ? "text-green-700" : "text-red-600"
              }`}
            >
              {detail.marginPercent.toFixed(1)}%
            </div>
            {detail.marginAmount !== null && (
              <div className="text-xs text-gray-400 mt-0.5">
                {formatCostRounded(Math.abs(detail.marginAmount))} per unit
              </div>
            )}
          </div>
        )}
      </div>

      {/* Ingredient breakdown */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
            Ingredients
          </h3>
        </div>
        {detail.ingredients.length === 0 ? (
          <div className="p-6 text-center text-sm text-gray-400">
            No ingredients added yet.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-500 border-b border-gray-100">
                <th className="px-5 py-3 text-left font-medium">Ingredient</th>
                <th className="px-5 py-3 text-right font-medium">Qty</th>
                <th className="px-5 py-3 text-left font-medium">Unit</th>
                <th className="px-5 py-3 text-right font-medium">Unit Cost</th>
                <th className="px-5 py-3 text-right font-medium">Line Cost</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {detail.ingredients.map((ing) => (
                <tr key={ing.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3 text-gray-900">{ing.ingredientName}</td>
                  <td className="px-5 py-3 text-right text-gray-700">
                    {ing.quantity}
                  </td>
                  <td className="px-5 py-3 text-gray-600">
                    {INGREDIENT_UNIT_LABELS[ing.unit] ?? ing.unit}
                  </td>
                  <td className="px-5 py-3 text-right text-gray-600">
                    {formatCost(ing.ingredientUnitCost)}/
                    {INGREDIENT_UNIT_LABELS[ing.ingredientUnit] ?? ing.ingredientUnit}
                  </td>
                  <td className="px-5 py-3 text-right font-medium text-gray-900">
                    {formatCost(ing.lineCost)}
                  </td>
                </tr>
              ))}
              <tr className="bg-gray-50 border-t-2 border-gray-200">
                <td colSpan={4} className="px-5 py-3 text-right text-sm font-semibold text-gray-700">
                  Total
                </td>
                <td className="px-5 py-3 text-right font-bold text-gray-900">
                  {formatCostRounded(detail.totalCost)}
                </td>
              </tr>
            </tbody>
          </table>
        )}
      </div>

      {detail.notes && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Notes</div>
          <p className="text-sm text-gray-700">{detail.notes}</p>
        </div>
      )}
    </div>
  );
}
