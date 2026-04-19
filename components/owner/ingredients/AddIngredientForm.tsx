"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { CreateIngredientInput, IngredientUnit } from "@/types/owner-ingredients";
import { INGREDIENT_UNIT_LABELS } from "@/types/owner-ingredients";

const UNITS = Object.keys(INGREDIENT_UNIT_LABELS) as IngredientUnit[];

const GST_RATE = 0.1;

interface Props {
  storeId: string;
}

export default function AddIngredientForm({ storeId }: Props) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [unit, setUnit] = useState<IngredientUnit>("GRAM");
  const [totalQtyStr, setTotalQtyStr] = useState("");
  const [totalPriceStr, setTotalPriceStr] = useState("");
  const [gstIncluded, setGstIncluded] = useState(false);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totalQty = parseFloat(totalQtyStr);
  const totalPrice = parseFloat(totalPriceStr);
  const exGstPrice = gstIncluded ? totalPrice / (1 + GST_RATE) : totalPrice;
  const computedUnitCost =
    totalQty > 0 && totalPrice > 0
      ? Math.round((exGstPrice / totalQty) * 100)
      : null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!totalQty || totalQty <= 0) {
      setError("총 용량을 입력해주세요.");
      return;
    }
    if (!totalPrice || totalPrice <= 0) {
      setError("총 가격을 입력해주세요.");
      return;
    }
    if (computedUnitCost === null || computedUnitCost <= 0) {
      setError("유닛 코스트를 계산할 수 없습니다. 입력값을 확인해주세요.");
      return;
    }
    setSubmitting(true);
    try {
      const body: CreateIngredientInput = {
        storeId,
        name,
        unit,
        unitCost: computedUnitCost,
        notes: notes || undefined,
      };
      const res = await fetch("/api/owner/ingredients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Failed to create ingredient");
        return;
      }
      setName("");
      setTotalQtyStr("");
      setTotalPriceStr("");
      setGstIncluded(false);
      setNotes("");
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white rounded-xl border border-gray-200 p-5 space-y-4"
    >
      <h2 className="text-sm font-semibold text-gray-900">Add Ingredient</h2>
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Bread flour"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Unit <span className="text-red-500">*</span>
          </label>
          <select
            required
            value={unit}
            onChange={(e) => setUnit(e.target.value as IngredientUnit)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            {UNITS.map((u) => (
              <option key={u} value={u}>
                {INGREDIENT_UNIT_LABELS[u]} ({u})
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            총 용량 <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            min="0"
            step="any"
            required
            value={totalQtyStr}
            onChange={(e) => setTotalQtyStr(e.target.value)}
            placeholder="2000"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            총 구매가격 ($) <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            min="0"
            step="0.01"
            required
            value={totalPriceStr}
            onChange={(e) => setTotalPriceStr(e.target.value)}
            placeholder="35.00"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
        <div className="flex items-center gap-2 pb-0.5">
          <input
            type="checkbox"
            id="ingredient-gst"
            checked={gstIncluded}
            onChange={(e) => setGstIncluded(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
          />
          <label htmlFor="ingredient-gst" className="text-xs text-gray-600 select-none">
            GST 포함 가격
          </label>
        </div>
        <div className="sm:col-span-2">
          <div className="text-xs font-medium text-gray-500 mb-1">자동 계산된 Unit Cost (ex-GST)</div>
          <div className="rounded-lg bg-gray-50 border border-gray-200 px-3 py-2 text-sm text-gray-700">
            {computedUnitCost !== null
              ? `$${(computedUnitCost / 100).toFixed(6)} / ${INGREDIENT_UNIT_LABELS[unit]}`
              : "—"}
          </div>
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Notes (optional)</label>
        <input
          type="text"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="e.g. High-grade flour"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={submitting}
        className="px-5 py-2 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 disabled:opacity-50 transition"
      >
        {submitting ? "Saving…" : "Add Ingredient"}
      </button>
    </form>
  );
}
