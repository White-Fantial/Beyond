"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { RecipeYieldUnit } from "@/types/owner-recipes";
import { RECIPE_YIELD_UNIT_LABELS } from "@/types/owner-recipes";

const YIELD_UNITS = Object.keys(RECIPE_YIELD_UNIT_LABELS) as RecipeYieldUnit[];

interface Store {
  id: string;
  name: string;
  tenantId: string;
  tenant?: { displayName: string } | null;
}

interface Props {
  stores: Store[];
}

export default function AdminCreateRecipeForm({ stores }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [storeId, setStoreId] = useState("");
  const [name, setName] = useState("");
  const [yieldQty, setYieldQty] = useState("1");
  const [yieldUnit, setYieldUnit] = useState<RecipeYieldUnit>("EACH");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const qty = parseInt(yieldQty, 10);
    if (!storeId) {
      setError("스토어를 선택해주세요.");
      return;
    }
    if (!name.trim()) {
      setError("레시피 이름을 입력해주세요.");
      return;
    }
    if (!qty || qty < 1) {
      setError("수율 수량은 1 이상이어야 합니다.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/recipes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeId,
          name: name.trim(),
          yieldQty: qty,
          yieldUnit,
          notes: notes.trim() || undefined,
          ingredients: [],
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "레시피 생성에 실패했습니다.");
        return;
      }
      // Reset form and refresh
      setStoreId("");
      setName("");
      setYieldQty("1");
      setYieldUnit("EACH");
      setNotes("");
      setOpen(false);
      router.refresh();
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="px-4 py-2 bg-red-700 text-white text-sm font-medium rounded-lg hover:bg-red-800 transition"
      >
        + 레시피 등록
      </button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white rounded-xl border border-gray-200 p-5 space-y-4"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-900">레시피 등록</h2>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-xs text-gray-400 hover:text-gray-600"
        >
          닫기
        </button>
      </div>

      {/* Store selector */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">
          스토어 <span className="text-red-500">*</span>
        </label>
        <select
          required
          value={storeId}
          onChange={(e) => setStoreId(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
        >
          <option value="">스토어 선택…</option>
          {stores.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} ({s.tenant?.displayName ?? s.tenantId})
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="sm:col-span-1">
          <label className="block text-xs font-medium text-gray-600 mb-1">
            레시피 이름 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="클래식 베이글"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            수율 수량 <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            min="1"
            required
            value={yieldQty}
            onChange={(e) => setYieldQty(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            수율 단위 <span className="text-red-500">*</span>
          </label>
          <select
            required
            value={yieldUnit}
            onChange={(e) => setYieldUnit(e.target.value as RecipeYieldUnit)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            {YIELD_UNITS.map((u) => (
              <option key={u} value={u}>
                {RECIPE_YIELD_UNIT_LABELS[u]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">메모 (선택)</label>
        <input
          type="text"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="추가 설명…"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={submitting}
          className="px-5 py-2 bg-red-700 text-white text-sm font-medium rounded-lg hover:bg-red-800 disabled:opacity-50 transition"
        >
          {submitting ? "등록 중…" : "레시피 등록"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="px-5 py-2 bg-white border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition"
        >
          취소
        </button>
      </div>
    </form>
  );
}
