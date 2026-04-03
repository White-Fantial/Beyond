"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCallback } from "react";

interface Store {
  id: string;
  name: string;
}

interface Props {
  stores: Store[];
  tab: string;
}

export default function ActivityFilterBar({ stores, tab }: Props) {
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
      params.delete("page");
      params.set("tab", tab);
      router.push(`${pathname}?${params.toString()}`);
    },
    [router, pathname, searchParams, tab]
  );

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

      {/* Date range — start */}
      <input
        type="date"
        value={searchParams.get("startDate") ?? ""}
        onChange={(e) => update("startDate", e.target.value)}
        className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-500"
        placeholder="From"
      />

      {/* Date range — end */}
      <input
        type="date"
        value={searchParams.get("endDate") ?? ""}
        onChange={(e) => update("endDate", e.target.value)}
        className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-500"
        placeholder="To"
      />

      {/* Clear filters */}
      {(searchParams.get("storeId") || searchParams.get("startDate") || searchParams.get("endDate")) && (
        <button
          onClick={() => {
            const params = new URLSearchParams();
            params.set("tab", tab);
            router.push(`${pathname}?${params.toString()}`);
          }}
          className="text-xs text-gray-500 hover:text-gray-700 underline"
        >
          Clear filters
        </button>
      )}
    </div>
  );
}
