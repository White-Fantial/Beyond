"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { MarketplaceRecipe, ReviewActionInput } from "@/types/marketplace";

interface PendingRecipeRowProps {
  recipe: MarketplaceRecipe;
}

function PendingRecipeRow({ recipe }: PendingRecipeRowProps) {
  const router = useRouter();
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  async function performAction(action: ReviewActionInput["action"]) {
    setLoading(true);
    try {
      if (action === "PUBLISHED") {
        await fetch(`/api/marketplace/recipes/${recipe.id}/publish`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ notes }),
        });
      } else {
        await fetch(`/api/marketplace/recipes/${recipe.id}/review`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action, notes }),
        });
      }
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-5 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-semibold text-gray-900">{recipe.title}</h3>
          <div className="flex gap-2 mt-1 text-xs text-gray-400">
            {recipe.providerName && <span>제공자: {recipe.providerName}</span>}
            {recipe.cuisineTag && <span>• {recipe.cuisineTag}</span>}
            <span>
              •{" "}
              {new Date(recipe.createdAt).toLocaleDateString("ko-KR")}
            </span>
          </div>
          {recipe.description && (
            <p className="text-sm text-gray-600 mt-2">{recipe.description}</p>
          )}
        </div>
        <div className="text-right text-sm shrink-0">
          <p className="font-semibold text-gray-900">
            {recipe.salePrice.toLocaleString("ko-KR")}원
          </p>
          <p className="text-xs text-gray-400">
            권장: {recipe.recommendedPrice.toLocaleString("ko-KR")}원
          </p>
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">
          검토 의견 (선택)
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          placeholder="승인/반려/수정요청 사유를 입력하세요"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
      </div>

      <div className="flex gap-2 justify-end">
        <button
          onClick={() => performAction("CHANGE_REQUESTED")}
          disabled={loading}
          className="px-3 py-1.5 text-xs border border-yellow-300 text-yellow-700 bg-yellow-50 rounded-lg hover:bg-yellow-100 disabled:opacity-50"
        >
          수정 요청
        </button>
        <button
          onClick={() => performAction("REJECTED")}
          disabled={loading}
          className="px-3 py-1.5 text-xs border border-red-300 text-red-700 bg-red-50 rounded-lg hover:bg-red-100 disabled:opacity-50"
        >
          반려
        </button>
        <button
          onClick={() => performAction("APPROVED")}
          disabled={loading}
          className="px-3 py-1.5 text-xs border border-teal-300 text-teal-700 bg-teal-50 rounded-lg hover:bg-teal-100 disabled:opacity-50"
        >
          승인
        </button>
        <button
          onClick={() => performAction("PUBLISHED")}
          disabled={loading}
          className="px-3 py-1.5 text-xs bg-green-600 hover:bg-green-700 text-white rounded-lg disabled:opacity-50"
        >
          {loading ? "처리 중..." : "승인 + 게시"}
        </button>
      </div>
    </div>
  );
}

export default function PendingRecipesList({ recipes }: { recipes: MarketplaceRecipe[] }) {
  if (recipes.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400">
        <p className="text-4xl mb-3">✅</p>
        <p className="text-sm">검토 대기 중인 레시피가 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {recipes.map((r) => (
        <PendingRecipeRow key={r.id} recipe={r} />
      ))}
    </div>
  );
}
