"use client";

import { useState, useTransition } from "react";
import type { MarketplaceRecipe, MarketplaceRecipeType } from "@/types/marketplace";
import RecipeCard from "@/components/marketplace/RecipeCard";

interface SearchResult {
  items: MarketplaceRecipe[];
  total: number;
}

export default function MarketplaceRecipeSearch() {
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<MarketplaceRecipeType | "ALL">("ALL");
  const [result, setResult] = useState<SearchResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      try {
        const params = new URLSearchParams({
          status: "PUBLISHED",
          pageSize: "50",
        });
        if (query.trim()) params.set("q", query.trim());
        if (typeFilter !== "ALL") params.set("type", typeFilter);

        const res = await fetch(`/api/marketplace/recipes?${params.toString()}`);
        if (!res.ok) {
          setError("검색 중 오류가 발생했습니다.");
          return;
        }
        const json = await res.json();
        setResult(json.data as SearchResult);
      } catch {
        setError("검색 중 오류가 발생했습니다.");
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* Search form */}
      <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="레시피 이름 또는 설명으로 검색..."
          className="flex-1 border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
        />

        <select
          value={typeFilter}
          onChange={(e) =>
            setTypeFilter(e.target.value as MarketplaceRecipeType | "ALL")
          }
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
        >
          <option value="ALL">전체 (무료 + 프리미엄)</option>
          <option value="BASIC">무료 레시피만</option>
          <option value="PREMIUM">프리미엄 레시피만</option>
        </select>

        <button
          type="submit"
          disabled={isPending}
          className="px-5 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isPending ? "검색 중..." : "검색"}
        </button>
      </form>

      {/* Error */}
      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          {error}
        </p>
      )}

      {/* Results */}
      {result !== null && (
        <div>
          <p className="text-sm text-gray-500 mb-4">
            검색 결과{" "}
            <span className="font-semibold text-gray-800">{result.total}개</span>
          </p>

          {result.items.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-10 text-center text-sm text-gray-400">
              <p className="text-2xl mb-2">🔍</p>
              <p>검색 결과가 없습니다. 다른 키워드로 시도해보세요.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {result.items.map((recipe) => (
                <RecipeCard key={recipe.id} recipe={recipe} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Initial state hint */}
      {result === null && !isPending && (
        <div className="bg-gray-50 rounded-xl border border-dashed border-gray-200 p-10 text-center text-sm text-gray-400">
          <p className="text-2xl mb-2">🍽️</p>
          <p>키워드를 입력하거나 검색 버튼을 눌러 레시피를 찾아보세요.</p>
          <p className="mt-1">마켓플레이스의 무료 및 프리미엄 레시피를 검색할 수 있습니다.</p>
        </div>
      )}
    </div>
  );
}
