"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useTransition } from "react";

interface Props {
  currentFrom?: string;
  currentTo?: string;
  currentTenantId?: string;
  currentStoreId?: string;
  currentProvider?: string;
}

export default function AdminAnalyticsFilterBar({
  currentFrom,
  currentTo,
  currentTenantId,
  currentStoreId,
  currentProvider,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    const params = new URLSearchParams(searchParams.toString());

    const fields = ["from", "to", "tenantId", "storeId", "provider"];
    for (const field of fields) {
      const val = data.get(field) as string;
      if (val) {
        params.set(field, val);
      } else {
        params.delete(field);
      }
    }

    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  }

  function handleReset() {
    startTransition(() => {
      router.push(pathname);
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white rounded-lg border border-gray-200 p-4 mb-6 flex flex-wrap gap-3 items-end"
    >
      <div className="flex flex-col gap-1">
        <label className="text-xs text-gray-500">시작일</label>
        <input
          type="date"
          name="from"
          defaultValue={currentFrom}
          className="border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs text-gray-500">종료일</label>
        <input
          type="date"
          name="to"
          defaultValue={currentTo}
          className="border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs text-gray-500">테넌트 ID</label>
        <input
          type="text"
          name="tenantId"
          defaultValue={currentTenantId}
          placeholder="테넌트 ID"
          className="border border-gray-300 rounded px-2 py-1.5 text-sm w-40 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs text-gray-500">매장 ID</label>
        <input
          type="text"
          name="storeId"
          defaultValue={currentStoreId}
          placeholder="매장 ID"
          className="border border-gray-300 rounded px-2 py-1.5 text-sm w-40 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs text-gray-500">공급자</label>
        <select
          name="provider"
          defaultValue={currentProvider ?? ""}
          className="border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="">전체</option>
          <option value="LOYVERSE">Loyverse</option>
          <option value="UBER_EATS">Uber Eats</option>
          <option value="DOORDASH">DoorDash</option>
          <option value="STRIPE">Stripe</option>
          <option value="OTHER">기타</option>
        </select>
      </div>
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={isPending}
          className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {isPending ? "적용 중..." : "필터 적용"}
        </button>
        <button
          type="button"
          onClick={handleReset}
          disabled={isPending}
          className="px-3 py-1.5 border border-gray-300 text-gray-600 text-sm rounded hover:bg-gray-50 disabled:opacity-50"
        >
          초기화
        </button>
      </div>
    </form>
  );
}
