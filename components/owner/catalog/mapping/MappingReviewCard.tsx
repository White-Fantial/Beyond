"use client";

/**
 * MappingReviewCard — summary cards for the top of the mapping review page.
 */

import type { MappingReviewSummary } from "@/types/catalog-mapping";

interface Props {
  summary: MappingReviewSummary;
}

function SummaryTile({
  label,
  count,
  colorClass,
}: {
  label: string;
  count: number;
  colorClass: string;
}) {
  return (
    <div className={`rounded-lg border p-4 flex flex-col gap-1 ${colorClass}`}>
      <div className="text-xs font-medium opacity-70">{label}</div>
      <div className="text-2xl font-bold">{count}</div>
    </div>
  );
}

export default function MappingReviewCard({ summary }: Props) {
  const { totals } = summary;
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <SummaryTile
        label="Active"
        count={totals.active}
        colorClass="bg-green-50 border-green-200 text-green-900"
      />
      <SummaryTile
        label="Needs Review"
        count={totals.needsReview}
        colorClass="bg-yellow-50 border-yellow-200 text-yellow-900"
      />
      <SummaryTile
        label="Unmatched"
        count={totals.unmatched}
        colorClass="bg-orange-50 border-orange-200 text-orange-900"
      />
      <SummaryTile
        label="Broken"
        count={totals.broken}
        colorClass="bg-red-50 border-red-200 text-red-900"
      />
    </div>
  );
}
