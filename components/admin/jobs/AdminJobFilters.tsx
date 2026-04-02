"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import type { AdminJobFilterParams } from "@/types/admin-jobs";
import { JOB_TYPE_LABELS, JOB_STATUS_LABELS, JOB_TRIGGER_SOURCE_LABELS } from "@/lib/admin/jobs/labels";

interface AdminJobFiltersProps {
  current: AdminJobFilterParams;
}

const JOB_TYPE_OPTIONS = Object.entries(JOB_TYPE_LABELS).map(([value, label]) => ({
  value,
  label,
}));

const STATUS_OPTIONS = Object.entries(JOB_STATUS_LABELS).map(([value, label]) => ({
  value,
  label,
}));

const TRIGGER_OPTIONS = Object.entries(JOB_TRIGGER_SOURCE_LABELS).map(([value, label]) => ({
  value,
  label,
}));

export default function AdminJobFilters({ current }: AdminJobFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function update(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  }

  function clearAll() {
    router.push(pathname);
  }

  const hasFilters = !!(
    current.jobType ||
    current.status ||
    current.tenantId ||
    current.storeId ||
    current.provider ||
    current.triggerSource ||
    current.failedOnly
  );

  return (
    <div className="flex flex-wrap gap-3 mb-5">
      {/* Job type */}
      <select
        value={current.jobType ?? ""}
        onChange={(e) => update("jobType", e.target.value)}
        className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-400"
      >
        <option value="">All job types</option>
        {JOB_TYPE_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>

      {/* Status */}
      <select
        value={current.status ?? ""}
        onChange={(e) => update("status", e.target.value)}
        className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-400"
      >
        <option value="">All statuses</option>
        {STATUS_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>

      {/* Trigger source */}
      <select
        value={current.triggerSource ?? ""}
        onChange={(e) => update("triggerSource", e.target.value)}
        className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-400"
      >
        <option value="">All triggers</option>
        {TRIGGER_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>

      {/* Failed only toggle */}
      <label className="flex items-center gap-2 px-3 py-2 rounded-md border border-gray-300 text-sm text-gray-700 cursor-pointer hover:bg-gray-50">
        <input
          type="checkbox"
          checked={current.failedOnly === "true" || current.failedOnly === "1"}
          onChange={(e) => update("failedOnly", e.target.checked ? "true" : "")}
          className="rounded"
        />
        Failed only
      </label>

      {/* Clear filters */}
      {hasFilters && (
        <button
          type="button"
          onClick={clearAll}
          className="px-3 py-2 rounded-md border border-gray-300 text-sm text-gray-500 hover:bg-gray-50 hover:text-gray-700"
        >
          Clear filters
        </button>
      )}
    </div>
  );
}
