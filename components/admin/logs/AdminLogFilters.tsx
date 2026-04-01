"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useCallback, useTransition } from "react";

const LOG_TYPE_OPTIONS = [
  { value: "", label: "모든 로그 유형" },
  { value: "AUDIT", label: "Audit" },
  { value: "CONNECTION_ACTION", label: "Connection" },
  { value: "WEBHOOK", label: "Webhook" },
  { value: "ORDER_EVENT", label: "Order Event" },
];

const PROVIDER_OPTIONS = [
  { value: "", label: "모든 Provider" },
  { value: "LOYVERSE", label: "Loyverse" },
  { value: "UBER_EATS", label: "Uber Eats" },
  { value: "DOORDASH", label: "DoorDash" },
  { value: "STRIPE", label: "Stripe" },
];

interface AdminLogFiltersProps {
  current: {
    q?: string;
    logType?: string;
    from?: string;
    to?: string;
    tenantId?: string;
    storeId?: string;
    provider?: string;
    status?: string;
    actionType?: string;
    errorOnly?: string;
  };
}

export default function AdminLogFilters({ current }: AdminLogFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const updateParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      params.delete("page");
      startTransition(() => {
        router.push(`${pathname}?${params.toString()}`);
      });
    },
    [router, pathname, searchParams]
  );

  const clearAll = useCallback(() => {
    startTransition(() => {
      router.push(pathname);
    });
  }, [router, pathname]);

  const hasAnyFilter = !!(
    current.q ||
    current.logType ||
    current.from ||
    current.to ||
    current.tenantId ||
    current.storeId ||
    current.provider ||
    current.status ||
    current.actionType ||
    current.errorOnly
  );

  return (
    <div
      className={`flex flex-col gap-3 mb-5 p-4 bg-white border border-gray-200 rounded-lg shadow-sm ${
        isPending ? "opacity-60 pointer-events-none" : ""
      }`}
    >
      {/* Row 1: search + date range */}
      <div className="flex flex-col sm:flex-row gap-2">
        <input
          type="text"
          placeholder="검색 (action, event, message...)"
          defaultValue={current.q ?? ""}
          className="flex-1 min-w-0 px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-300"
          onBlur={(e) => updateParam("q", e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") updateParam("q", (e.target as HTMLInputElement).value);
          }}
        />
        <div className="flex gap-2 items-center">
          <input
            type="date"
            defaultValue={current.from ?? ""}
            className="px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-300"
            onChange={(e) => updateParam("from", e.target.value)}
          />
          <span className="text-gray-400 text-sm">—</span>
          <input
            type="date"
            defaultValue={current.to ?? ""}
            className="px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-300"
            onChange={(e) => updateParam("to", e.target.value)}
          />
        </div>
      </div>

      {/* Row 2: dropdowns + errorOnly */}
      <div className="flex flex-wrap gap-2 items-center">
        <select
          value={current.logType ?? ""}
          onChange={(e) => updateParam("logType", e.target.value)}
          className="px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-300 bg-white"
        >
          {LOG_TYPE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>

        <select
          value={current.provider ?? ""}
          onChange={(e) => updateParam("provider", e.target.value)}
          className="px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-300 bg-white"
        >
          {PROVIDER_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>

        <input
          type="text"
          placeholder="Tenant ID"
          defaultValue={current.tenantId ?? ""}
          className="w-44 px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-300"
          onBlur={(e) => updateParam("tenantId", e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") updateParam("tenantId", (e.target as HTMLInputElement).value);
          }}
        />

        <input
          type="text"
          placeholder="Store ID"
          defaultValue={current.storeId ?? ""}
          className="w-44 px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-300"
          onBlur={(e) => updateParam("storeId", e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") updateParam("storeId", (e.target as HTMLInputElement).value);
          }}
        />

        <label className="flex items-center gap-1.5 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={current.errorOnly === "1"}
            onChange={(e) => updateParam("errorOnly", e.target.checked ? "1" : "")}
            className="rounded border-gray-300 text-red-600 focus:ring-red-300"
          />
          <span className="text-sm text-gray-600">오류만 보기</span>
        </label>

        {hasAnyFilter && (
          <button
            type="button"
            onClick={clearAll}
            className="px-3 py-1.5 text-xs font-medium text-gray-500 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          >
            필터 초기화
          </button>
        )}
      </div>
    </div>
  );
}
