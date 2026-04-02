"use client";

import { useRouter, usePathname } from "next/navigation";
import { useCallback } from "react";
import type { OwnerReportFilters, OwnerReportRangePreset } from "@/types/owner-reports";
import { presetLabel } from "@/lib/owner/reports/labels";
import { filtersToParams } from "@/lib/owner/reports/filters";

interface Props {
  filters: OwnerReportFilters;
  showStoreFilter?: boolean;
}

const PRESETS: OwnerReportRangePreset[] = [
  "today", "yesterday", "last7", "last30", "thisMonth", "lastMonth",
];

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default function OwnerReportsFilterBar({ filters, showStoreFilter: _showStoreFilter = false }: Props) {
  const router = useRouter();
  const pathname = usePathname();

  const updateFilters = useCallback(
    (updates: Partial<OwnerReportFilters>) => {
      const newFilters: OwnerReportFilters = { ...filters, ...updates };
      const params = filtersToParams(newFilters);
      const qs = new URLSearchParams(params).toString();
      router.push(`${pathname}?${qs}`);
    },
    [filters, pathname, router]
  );

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-3 flex flex-wrap items-center gap-2">
      {/* Preset buttons */}
      <div className="flex flex-wrap gap-1">
        {PRESETS.map((preset) => (
          <button
            key={preset}
            onClick={() => updateFilters({ preset })}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              filters.preset === preset
                ? "bg-indigo-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {presetLabel(preset)}
          </button>
        ))}
      </div>

      {/* Custom date range */}
      {filters.preset === "custom" && (
        <div className="flex items-center gap-1">
          <input
            type="date"
            value={filters.from ?? ""}
            onChange={(e) => updateFilters({ from: e.target.value })}
            className="text-xs border border-gray-200 rounded px-2 py-1"
          />
          <span className="text-xs text-gray-400">to</span>
          <input
            type="date"
            value={filters.to ?? ""}
            onChange={(e) => updateFilters({ to: e.target.value })}
            className="text-xs border border-gray-200 rounded px-2 py-1"
          />
        </div>
      )}

      {/* Separator */}
      <div className="flex-1" />

      {/* Compare toggle */}
      <label className="flex items-center gap-1.5 cursor-pointer">
        <input
          type="checkbox"
          checked={filters.comparePrevious}
          onChange={(e) => updateFilters({ comparePrevious: e.target.checked })}
          className="rounded text-indigo-600 w-3.5 h-3.5"
        />
        <span className="text-xs text-gray-600">Compare to previous</span>
      </label>
    </div>
  );
}
