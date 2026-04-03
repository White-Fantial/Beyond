"use client";

import { useState } from "react";
import Link from "next/link";
import type { ChurnRiskData, ChurnRiskCustomer, ChurnRiskLevel } from "@/types/owner-analytics";

interface Props {
  data: ChurnRiskData;
}

type SortKey = "riskLevel" | "daysSinceLastOrder" | "totalOrders" | "activeSubscriptions";

const RISK_ORDER: Record<ChurnRiskLevel, number> = { HIGH: 0, MEDIUM: 1, LOW: 2 };

function RiskBadge({ level }: { level: ChurnRiskLevel }) {
  const styles: Record<ChurnRiskLevel, string> = {
    HIGH: "bg-red-100 text-red-700 border border-red-200",
    MEDIUM: "bg-amber-100 text-amber-700 border border-amber-200",
    LOW: "bg-yellow-100 text-yellow-700 border border-yellow-200",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${styles[level]}`}>
      {level}
    </span>
  );
}

export default function ChurnRiskTable({ data }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>("riskLevel");
  const [sortAsc, setSortAsc] = useState(false);

  if (data.customers.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6 text-center">
        <p className="text-sm font-medium text-gray-600">No at-risk customers found</p>
        <p className="text-xs text-gray-400 mt-1">All customers show stable or improving order frequency.</p>
      </div>
    );
  }

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortAsc((a) => !a);
    } else {
      setSortKey(key);
      setSortAsc(false);
    }
  };

  const sorted = [...data.customers].sort((a: ChurnRiskCustomer, b: ChurnRiskCustomer) => {
    let diff = 0;
    if (sortKey === "riskLevel") {
      diff = RISK_ORDER[a.riskLevel] - RISK_ORDER[b.riskLevel];
    } else if (sortKey === "daysSinceLastOrder") {
      diff = (b.daysSinceLastOrder ?? 0) - (a.daysSinceLastOrder ?? 0);
    } else if (sortKey === "totalOrders") {
      diff = b.totalOrders - a.totalOrders;
    } else if (sortKey === "activeSubscriptions") {
      diff = b.activeSubscriptions - a.activeSubscriptions;
    }
    return sortAsc ? -diff : diff;
  });

  function SortIcon({ col }: { col: SortKey }) {
    if (sortKey !== col) return <span className="text-gray-300 ml-1">⇅</span>;
    return <span className="text-brand-600 ml-1">{sortAsc ? "↑" : "↓"}</span>;
  }

  function ThBtn({ col, label }: { col: SortKey; label: string }) {
    return (
      <button
        onClick={() => toggleSort(col)}
        className="flex items-center text-xs font-medium text-gray-500 hover:text-gray-700"
      >
        {label}
        <SortIcon col={col} />
      </button>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="p-4 border-b border-gray-100 flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-gray-900">Churn Risk Signals</h2>
          <p className="text-xs text-gray-400 mt-0.5">Customers with declining order frequency</p>
        </div>
        <div className="flex gap-2 text-xs">
          <span className="text-red-600 font-medium">{data.highRiskCount} HIGH</span>
          <span className="text-amber-600 font-medium">{data.mediumRiskCount} MED</span>
          <span className="text-yellow-600 font-medium">{data.lowRiskCount} LOW</span>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-2.5">
                <ThBtn col="riskLevel" label="Risk" />
              </th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">Customer</th>
              <th className="text-left px-4 py-2.5">
                <ThBtn col="daysSinceLastOrder" label="Last Order" />
              </th>
              <th className="text-center px-4 py-2.5">
                <ThBtn col="totalOrders" label="Orders" />
              </th>
              <th className="text-center px-4 py-2.5">
                <ThBtn col="activeSubscriptions" label="Subs" />
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {sorted.map((customer) => (
              <tr key={customer.customerId} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <RiskBadge level={customer.riskLevel} />
                </td>
                <td className="px-4 py-3">
                  <Link
                    href={`/owner/customers/${customer.customerId}`}
                    className="font-medium text-gray-900 hover:text-brand-600 text-sm"
                  >
                    {customer.customerName ?? "Unknown"}
                  </Link>
                  {customer.customerEmail && (
                    <div className="text-xs text-gray-400">{customer.customerEmail}</div>
                  )}
                </td>
                <td className="px-4 py-3 text-xs text-gray-500">
                  {customer.daysSinceLastOrder !== null
                    ? `${customer.daysSinceLastOrder}d ago`
                    : "—"}
                </td>
                <td className="px-4 py-3 text-center">
                  <span className="text-xs text-gray-700">
                    {customer.recentOrders}
                    <span className="text-gray-400"> / {customer.priorOrders}</span>
                  </span>
                  <div className="text-[10px] text-gray-400">recent / prior</div>
                </td>
                <td className="px-4 py-3 text-center text-sm text-gray-700">
                  {customer.activeSubscriptions > 0 ? (
                    <span className="font-medium text-indigo-600">{customer.activeSubscriptions}</span>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
