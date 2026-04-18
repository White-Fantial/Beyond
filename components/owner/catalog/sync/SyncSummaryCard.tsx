"use client";

/**
 * SyncSummaryCard — displays summary metric cards for the sync dashboard.
 */

import type { SyncInboxSummary } from "@/types/catalog-sync";

interface Props {
  summary: SyncInboxSummary;
}

export default function SyncSummaryCard({ summary }: Props) {
  const cards = [
    { label: "Open Changes",   value: summary.openExternalChanges, color: "blue" },
    { label: "Open Conflicts", value: summary.openConflicts,       color: "yellow" },
    { label: "Ready Items",    value: summary.readyPlanItems,      color: "green" },
    { label: "Blocked Items",  value: summary.blockedPlanItems,    color: "orange" },
    { label: "Failed Items",   value: summary.failedPlanItems,     color: "red" },
  ] as const;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className="bg-white rounded-lg border border-gray-200 p-4 text-center shadow-sm"
        >
          <div className="text-2xl font-bold text-gray-900">{card.value}</div>
          <div className="text-xs text-gray-500 mt-1">{card.label}</div>
        </div>
      ))}
      {summary.lastSyncAt && (
        <div className="col-span-full text-right text-xs text-gray-400">
          Last sync: {new Date(summary.lastSyncAt).toLocaleString()}
        </div>
      )}
    </div>
  );
}
