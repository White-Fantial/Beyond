"use client";

import Link from "next/link";
import StatusBadge from "@/components/admin/StatusBadge";
import {
  formatPriceMinor,
  labelBillingInterval,
  labelPlanStatus,
} from "@/lib/billing/labels";
import type { AdminPlanListItem } from "@/types/admin-billing";

interface Props {
  plans: AdminPlanListItem[];
}

export default function AdminPlanTable({ plans }: Props) {
  if (plans.length === 0) {
    return <p className="text-sm text-gray-400 py-4 text-center">No plans available.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-xs text-gray-500 border-b border-gray-200">
            <th className="text-left pb-2 pr-4">Code</th>
            <th className="text-left pb-2 pr-4">Name</th>
            <th className="text-left pb-2 pr-4">Status</th>
            <th className="text-left pb-2 pr-4">Billing Cycle</th>
            <th className="text-right pb-2 pr-4">Price</th>
            <th className="text-right pb-2 pr-4">Tenants</th>
            <th className="text-center pb-2 pr-4">Default Value</th>
            <th className="text-right pb-2">Updated</th>
          </tr>
        </thead>
        <tbody>
          {plans.map((plan) => (
            <tr key={plan.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
              <td className="py-2 pr-4 font-mono text-xs text-gray-600">{plan.code}</td>
              <td className="py-2 pr-4 font-medium">
                <Link
                  href={`/admin/billing/plans/${plan.id}`}
                  className="text-blue-600 hover:underline"
                >
                  {plan.name}
                </Link>
              </td>
              <td className="py-2 pr-4">
                <StatusBadge value={plan.status} label={labelPlanStatus(plan.status)} />
              </td>
              <td className="py-2 pr-4 text-gray-600">{labelBillingInterval(plan.billingInterval)}</td>
              <td className="py-2 pr-4 text-right font-medium">
                {formatPriceMinor(plan.priceAmountMinor, plan.currencyCode)}
              </td>
              <td className="py-2 pr-4 text-right">{plan.tenantCount}</td>
              <td className="py-2 pr-4 text-center">
                {plan.isDefault ? (
                  <span className="text-green-600 font-bold">✓</span>
                ) : (
                  <span className="text-gray-300">—</span>
                )}
              </td>
              <td className="py-2 text-right text-xs text-gray-400">
                {new Date(plan.updatedAt).toLocaleDateString("ko-KR")}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
