"use client";

/**
 * ExternalChangeSummaryCard — summary tiles for the external change detection page.
 */

import type { ExternalChangeSummary } from "@/types/catalog-external-changes";

interface Props {
  summary: ExternalChangeSummary;
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

export default function ExternalChangeSummaryCard({ summary }: Props) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      <SummaryTile label="Open" count={summary.totalOpen} colorClass="bg-yellow-50 border-yellow-200 text-yellow-900" />
      <SummaryTile label="Updated" count={summary.updated} colorClass="bg-blue-50 border-blue-200 text-blue-900" />
      <SummaryTile label="Created" count={summary.created} colorClass="bg-green-50 border-green-200 text-green-900" />
      <SummaryTile label="Missing/Deleted" count={summary.deleted} colorClass="bg-red-50 border-red-200 text-red-900" />
      <SummaryTile label="Structure" count={summary.structureChanges} colorClass="bg-purple-50 border-purple-200 text-purple-900" />
      <div className="rounded-lg border p-4 flex flex-col gap-1 bg-gray-50 border-gray-200 text-gray-900">
        <div className="text-xs font-medium opacity-70">Mapped / Unmapped</div>
        <div className="text-lg font-bold">
          {summary.mapped} / {summary.unmapped}
        </div>
      </div>
    </div>
  );
}
