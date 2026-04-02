import Link from "next/link";
import { formatMoneyFromMinor } from "@/lib/format/money";
import { ConnectionStatusBadge, StoreStatusBadge } from "./OwnerStatusBadge";
import type { OwnerDashboardStoreSummary } from "@/types/owner-dashboard";

interface OwnerStoreSummaryTableProps {
  stores: OwnerDashboardStoreSummary[];
}

export default function OwnerStoreSummaryTable({ stores }: OwnerStoreSummaryTableProps) {
  if (stores.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400 text-sm">
        No stores found. Add a store to get started.
      </div>
    );
  }

  return (
    <>
      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wide pb-3 pr-4">
                Store
              </th>
              <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wide pb-3 pr-4">
                Status
              </th>
              <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wide pb-3 pr-4">
                POS
              </th>
              <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wide pb-3 pr-4">
                Delivery
              </th>
              <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wide pb-3 pr-4">
                Orders Today
              </th>
              <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wide pb-3">
                Revenue Today
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {stores.map((store) => (
              <tr key={store.storeId} className="hover:bg-gray-50 transition-colors">
                <td className="py-3 pr-4">
                  <Link
                    href={`/owner/stores/${store.storeId}`}
                    className="font-medium text-gray-900 hover:text-brand-600 transition-colors"
                  >
                    {store.storeName}
                  </Link>
                  <div className="text-xs text-gray-400 mt-0.5">{store.storeCode}</div>
                </td>
                <td className="py-3 pr-4">
                  <StoreStatusBadge status={store.storeStatus} />
                </td>
                <td className="py-3 pr-4">
                  <ConnectionStatusBadge status={store.posStatus} />
                </td>
                <td className="py-3 pr-4">
                  <ConnectionStatusBadge status={store.deliveryStatus} />
                </td>
                <td className="py-3 pr-4 text-right font-medium text-gray-900">
                  {store.todayOrders}
                </td>
                <td className="py-3 text-right font-medium text-gray-900">
                  {formatMoneyFromMinor(store.todayRevenueAmount, store.currencyCode)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile stacked cards */}
      <div className="md:hidden space-y-3">
        {stores.map((store) => (
          <Link
            key={store.storeId}
            href={`/owner/stores/${store.storeId}`}
            className="block bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-colors"
          >
            <div className="flex items-start justify-between gap-2 mb-2">
              <div>
                <div className="font-medium text-gray-900">{store.storeName}</div>
                <div className="text-xs text-gray-400">{store.storeCode}</div>
              </div>
              <StoreStatusBadge status={store.storeStatus} />
            </div>
            <div className="flex flex-wrap gap-2 text-xs mb-2">
              <span className="text-gray-500">POS:</span>
              <ConnectionStatusBadge status={store.posStatus} />
              <span className="text-gray-500 ml-2">Delivery:</span>
              <ConnectionStatusBadge status={store.deliveryStatus} />
            </div>
            <div className="flex justify-between text-sm mt-2">
              <span className="text-gray-500">
                {store.todayOrders} order{store.todayOrders !== 1 ? "s" : ""} today
              </span>
              <span className="font-semibold text-gray-900">
                {formatMoneyFromMinor(store.todayRevenueAmount, store.currencyCode)}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </>
  );
}
