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

const SORT_OPTIONS = [
  { value: "recent_activity", label: "Recent Activity" },
  { value: "lifetime_revenue", label: "Lifetime Revenue" },
  { value: "total_orders", label: "Total Orders" },
  { value: "newest_customer", label: "Newest Customer" },
];

const SUB_STATUS_OPTIONS = [
  { value: "", label: "All Statuses" },
  { value: "ACTIVE", label: "Active Subscription" },
  { value: "PAUSED", label: "Paused Subscription" },
  { value: "CANCELLED", label: "Cancelled Subscription" },
  { value: "NONE", label: "No Subscription" },
];

export default function CustomerFilterBar({ stores }: Props) {
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
      // Reset page when filters change
      if (key !== "page") params.delete("page");
      router.push(`${pathname}?${params.toString()}`);
    },
    [router, pathname, searchParams]
  );

  return (
    <div className="flex flex-wrap items-center gap-2">
      <input
        type="search"
        placeholder="Search name, email, phone…"
        defaultValue={searchParams.get("q") ?? ""}
        onChange={(e) => update("q", e.target.value)}
        className="border border-gray-200 rounded px-3 py-1.5 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-brand-500 w-56"
      />

      <select
        value={searchParams.get("storeId") ?? ""}
        onChange={(e) => update("storeId", e.target.value)}
        className="border border-gray-200 rounded px-3 py-1.5 text-sm text-gray-800 focus:outline-none focus:ring-1 focus:ring-brand-500"
      >
        <option value="">All Stores</option>
        {stores.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </select>

      <select
        value={searchParams.get("subscriptionStatus") ?? ""}
        onChange={(e) => update("subscriptionStatus", e.target.value)}
        className="border border-gray-200 rounded px-3 py-1.5 text-sm text-gray-800 focus:outline-none focus:ring-1 focus:ring-brand-500"
      >
        {SUB_STATUS_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>

      <select
        value={searchParams.get("sort") ?? "recent_activity"}
        onChange={(e) => update("sort", e.target.value)}
        className="border border-gray-200 rounded px-3 py-1.5 text-sm text-gray-800 focus:outline-none focus:ring-1 focus:ring-brand-500"
      >
        {SORT_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            Sort: {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
