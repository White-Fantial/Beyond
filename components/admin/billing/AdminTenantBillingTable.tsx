"use client";

import Link from "next/link";
import StatusBadge from "@/components/admin/StatusBadge";
import { labelSubscriptionStatus } from "@/lib/billing/labels";
import type { AdminTenantBillingListItem } from "@/types/admin-billing";

interface Props {
  items: AdminTenantBillingListItem[];
}

export default function AdminTenantBillingTable({ items }: Props) {
  if (items.length === 0) {
    return <p className="text-sm text-gray-400 py-4 text-center">데이터가 없습니다.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-xs text-gray-500 border-b border-gray-200">
            <th className="text-left pb-2 pr-3">테넌트</th>
            <th className="text-left pb-2 pr-3">플랜</th>
            <th className="text-left pb-2 pr-3">상태</th>
            <th className="text-right pb-2 pr-3">매장</th>
            <th className="text-right pb-2 pr-3">사용자</th>
            <th className="text-right pb-2 pr-3">연동</th>
            <th className="text-center pb-2 pr-3">한도초과</th>
            <th className="text-right pb-2 pr-3">기간종료</th>
            <th className="text-right pb-2"></th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.tenantId} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
              <td className="py-2 pr-3">
                <div className="font-medium text-gray-900">{item.tenantDisplayName}</div>
                <div className="text-xs text-gray-400 font-mono">{item.tenantSlug}</div>
              </td>
              <td className="py-2 pr-3">
                <span className="font-mono text-xs text-gray-600">{item.planCode}</span>
                <div className="text-xs text-gray-400">{item.planName}</div>
              </td>
              <td className="py-2 pr-3">
                <StatusBadge
                  value={item.subscriptionStatus}
                  label={labelSubscriptionStatus(item.subscriptionStatus)}
                />
              </td>
              <td className="py-2 pr-3 text-right">{item.storesCount}</td>
              <td className="py-2 pr-3 text-right">{item.usersCount}</td>
              <td className="py-2 pr-3 text-right">{item.activeIntegrationsCount}</td>
              <td className="py-2 pr-3 text-center">
                {item.isOverLimit ? (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-50 text-red-700 border border-red-200">
                    초과
                  </span>
                ) : (
                  <span className="text-gray-300 text-xs">—</span>
                )}
              </td>
              <td className="py-2 pr-3 text-right text-xs text-gray-500">
                {item.currentPeriodEnd
                  ? new Date(item.currentPeriodEnd).toLocaleDateString("ko-KR")
                  : item.trialEnd
                  ? new Date(item.trialEnd).toLocaleDateString("ko-KR")
                  : "—"}
              </td>
              <td className="py-2 text-right">
                <Link
                  href={`/admin/billing/tenants/${item.tenantId}`}
                  className="text-blue-600 hover:underline text-xs"
                >
                  보기
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
