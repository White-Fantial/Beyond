"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCallback } from "react";

interface Store {
  id: string;
  name: string;
}

interface Props {
  stores: Store[];
}

export default function AnalyticsFilterBar({ stores }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const update = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      router.push(`${pathname}?${params.toString()}`);
    },
    [router, pathname, searchParams]
  );

  const hasFilters =
    searchParams.get("storeId") ||
    searchParams.get("from") ||
    searchParams.get("to") ||
    searchParams.get("horizon") ||
    searchParams.get("granularity");

  return (
    <div className="flex flex-wrap gap-3 items-center">
      {/* Store filter */}
      <select
        value={searchParams.get("storeId") ?? ""}
        onChange={(e) => update("storeId", e.target.value)}
        className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-500"
      >
        <option value="">All stores</option>
        {stores.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </select>

      {/* Date range — from */}
      <input
        type="date"
        value={searchParams.get("from") ?? ""}
        onChange={(e) => update("from", e.target.value)}
        className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-500"
        placeholder="From"
      />

      {/* Date range — to */}
      <input
        type="date"
        value={searchParams.get("to") ?? ""}
        onChange={(e) => update("to", e.target.value)}
        className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-500"
        placeholder="To"
      />

      {/* Forecast horizon */}
      <select
        value={searchParams.get("horizon") ?? "7"}
        onChange={(e) => update("horizon", e.target.value)}
        className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-500"
      >
        <option value="7">7-day forecast</option>
        <option value="14">14-day forecast</option>
        <option value="30">30-day forecast</option>
      </select>

      {/* Clear filters */}
      {hasFilters && (
        <button
          onClick={() => router.push(pathname)}
          className="text-xs text-gray-500 hover:text-gray-700 underline"
        >
          Clear filters
        </button>
      )}
    </div>
  );
}
