"use client";

import { Fragment, useState } from "react";
import type { RecipeDetail } from "@/types/owner-recipes";
import { INGREDIENT_UNIT_LABELS } from "@/types/owner-ingredients";
import { RECIPE_YIELD_UNIT_LABELS } from "@/types/owner-recipes";
import AddRecipeIngredientForm from "./AddRecipeIngredientForm";
import EditRecipeIngredientForm from "./EditRecipeIngredientForm";

interface Props {
  detail: RecipeDetail;
  /** When provided, shows the "Add Ingredient" button. */
  canEdit?: boolean;
}

const GST_RATE = 0.1;

function formatCost(minor: number) {
  return `$${(minor / 100).toFixed(4)}`;
}

function formatCostRounded(minor: number) {
  return `$${(minor / 100).toFixed(2)}`;
}

export default function RecipeCostBreakdown({ detail, canEdit }: Props) {
  const [sellingPriceGstIncluded, setSellingPriceGstIncluded] = useState(true);
  const [showAddIngredient, setShowAddIngredient] = useState(false);
  const [editingIngredientId, setEditingIngredientId] = useState<string | null>(null);

  const rawPrice = detail.catalogProductPrice;
  const effectivePrice =
    rawPrice !== null
      ? sellingPriceGstIncluded
        ? Math.round(rawPrice / (1 + GST_RATE))
        : rawPrice
      : null;

  const marginAmount =
    effectivePrice !== null ? effectivePrice - detail.costPerUnit : null;
  const marginPercent =
    effectivePrice !== null && effectivePrice > 0 && marginAmount !== null
      ? Math.round((marginAmount / effectivePrice) * 10000) / 100
      : null;

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
        {marginPercent !== null && (
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="text-xs text-gray-500 mb-1">Margin</div>
            <div
              className={`text-lg font-bold ${
                marginPercent >= 0 ? "text-green-700" : "text-red-600"
              }`}
            >
              {marginPercent.toFixed(1)}%
            </div>
            {marginAmount !== null && (
              <div className="text-xs text-gray-400 mt-0.5">
                {formatCostRounded(Math.abs(marginAmount))} per unit
              </div>
            )}
          </div>
        )}
      </div>

      {/* Selling price GST toggle */}
      {rawPrice !== null && (
        <div className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-lg px-4 py-3">
          <span className="text-xs text-gray-500 font-medium">판매가격:</span>
          <span className="text-sm font-semibold text-gray-800">
            {formatCostRounded(rawPrice)}
          </span>
          {sellingPriceGstIncluded && (
            <span className="text-xs text-gray-500">
              (ex-GST: {formatCostRounded(Math.round(rawPrice / (1 + GST_RATE)))})
            </span>
          )}
          <label className="flex items-center gap-1.5 ml-auto cursor-pointer">
            <input
              type="checkbox"
              checked={sellingPriceGstIncluded}
              onChange={(e) => setSellingPriceGstIncluded(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
            />
            <span className="text-xs text-gray-600 select-none">GST 포함 가격</span>
          </label>
        </div>
      )}

      {/* Ingredient breakdown */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
            Ingredients
          </h3>
          {canEdit && !showAddIngredient && (
            <button
              onClick={() => { setShowAddIngredient(true); setEditingIngredientId(null); }}
              className="text-xs font-medium text-brand-600 hover:text-brand-700 transition"
            >
              + Add Ingredient
            </button>
          )}
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
                <th className="px-5 py-3 text-right font-medium">Unit Cost (ex-GST)</th>
                <th className="px-5 py-3 text-right font-medium">Line Cost</th>
                {canEdit && <th className="px-5 py-3" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {detail.ingredients.map((ing) => (
                <Fragment key={ing.id}>
                  <tr className="hover:bg-gray-50 transition-colors">
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
                    {canEdit && (
                      <td className="px-5 py-3 text-right">
                        <button
                          onClick={() => {
                            setShowAddIngredient(false);
                            setEditingIngredientId(
                              editingIngredientId === ing.id ? null : ing.id
                            );
                          }}
                          className="text-xs font-medium text-brand-600 hover:text-brand-700 transition"
                        >
                          {editingIngredientId === ing.id ? "Cancel" : "Edit"}
                        </button>
                      </td>
                    )}
                  </tr>
                  {canEdit && editingIngredientId === ing.id && (
                    <tr key={`${ing.id}-edit`}>
                      <td colSpan={6} className="p-0">
                        <EditRecipeIngredientForm
                          recipeId={detail.id}
                          ingredient={ing}
                          currentIngredients={detail.ingredients}
                          onClose={() => setEditingIngredientId(null)}
                        />
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
              <tr className="bg-gray-50 border-t-2 border-gray-200">
                <td colSpan={canEdit ? 5 : 4} className="px-5 py-3 text-right text-sm font-semibold text-gray-700">
                  Total
                </td>
                <td className="px-5 py-3 text-right font-bold text-gray-900">
                  {formatCostRounded(detail.totalCost)}
                </td>
              </tr>
            </tbody>
          </table>
        )}
        {canEdit && showAddIngredient && (
          <AddRecipeIngredientForm
            recipeId={detail.id}
            storeId={detail.storeId}
            currentIngredients={detail.ingredients}
            onClose={() => setShowAddIngredient(false)}
          />
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
