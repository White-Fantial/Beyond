"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { FlagStatus } from "@/types/feature-flags";
import { labelFlagStatus } from "@/lib/flags/labels";

const ALL_STATUSES: FlagStatus[] = ["ACTIVE", "INACTIVE", "ARCHIVED"];

interface Props {
  flagKey: string;
  currentStatus: FlagStatus;
}

export default function AdminFeatureFlagStatusChangeForm({ flagKey, currentStatus }: Props) {
  const router = useRouter();
  const [status, setStatus] = useState<FlagStatus>(currentStatus);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleChange(newStatus: FlagStatus) {
    if (newStatus === status) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/feature-flags/${flagKey}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error ?? "오류가 발생했습니다.");
        return;
      }
      setStatus(newStatus);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <select
        value={status}
        onChange={(e) => handleChange(e.target.value as FlagStatus)}
        disabled={loading}
        className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm disabled:opacity-50"
      >
        {ALL_STATUSES.map((s) => (
          <option key={s} value={s}>
            {labelFlagStatus(s)}
          </option>
        ))}
      </select>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
}
