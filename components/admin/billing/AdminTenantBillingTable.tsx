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
    return <p className="text-sm text-gray-400 py-4 text-center">No data available.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-xs text-gray-500 border-b border-gray-200">
            <th className="text-left pb-2 pr-3">Tenant</th>
            <th className="text-left pb-2 pr-3">Plan</th>
            <th className="text-left pb-2 pr-3">Status</th>
            <th className="text-right pb-2 pr-3">Store</th>
            <th className="text-right pb-2 pr-3">User</th>
            <th className="text-right pb-2 pr-3">Integrations</th>
            <th className="text-center pb-2 pr-3">Over Limit</th>
            <th className="text-right pb-2 pr-3">Period End</th>
            <th className="text-right pb-2"></th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.tenantId} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
              <td className="py-2 pr-3">
                <Link href={`/admin/billing/tenants/${item.tenantId}`} className="font-medium text-blue-600 hover:underline">
                  {item.tenantDisplayName}
                </Link>
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
                    Over
                  </span>
                ) : (
                  <span className="text-gray-300 text-xs">—</span>
                )}
              </td>
              <td className="py-2 pr-3 text-right text-xs text-gray-500">
                {item.currentPeriodEnd
                  ? new Date(item.currentPeriodEnd).toLocaleDateString("en-US")
                  : item.trialEnd
                  ? new Date(item.trialEnd).toLocaleDateString("en-US")
                  : "—"}
              </td>
              <td className="py-2 text-right">
                <Link
                  href={`/admin/billing/tenants/${item.tenantId}`}
                  className="text-blue-600 hover:underline text-xs"
                >
                  View
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
