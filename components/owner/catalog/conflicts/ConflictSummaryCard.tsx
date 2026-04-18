"use client";

/**
 * ConflictSummaryCard — summary cards for the conflict center.
 */

import type { ConflictSummary } from "@/types/catalog-conflicts";

interface Props {
  summary: ConflictSummary;
}

function Card({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className={`rounded-lg border p-4 ${color}`}>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs text-gray-500 mt-0.5">{label}</div>
    </div>
  );
}

export default function ConflictSummaryCard({ summary }: Props) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
      <Card label="Open"             value={summary.totalOpen}         color="border-red-200 bg-red-50" />
      <Card label="In Review"        value={summary.totalInReview}     color="border-yellow-200 bg-yellow-50" />
      <Card label="Resolved"         value={summary.totalResolved}     color="border-green-200 bg-green-50" />
      <Card label="Ignored"          value={summary.totalIgnored}      color="border-gray-200 bg-gray-50" />
      <Card label="Field Conflicts"  value={summary.fieldConflicts}    color="border-blue-200 bg-blue-50" />
      <Card label="Structure"        value={summary.structureConflicts} color="border-purple-200 bg-purple-50" />
      <Card label="Missing Issues"   value={summary.missingIssues}     color="border-orange-200 bg-orange-50" />
    </div>
  );
}
