import type { OwnerStoreComparisonItem } from "@/types/owner-reports";
import { formatMinorCompact, formatMinorFull, formatRate } from "@/lib/owner/reports/labels";
import OwnerEmptyReportState from "./OwnerEmptyReportState";

interface Props {
  stores: OwnerStoreComparisonItem[];
}

export default function OwnerStoreComparisonTable({ stores }: Props) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <h2 className="text-base font-semibold text-gray-900 mb-4">Store Comparison</h2>
      {stores.length === 0 ? (
        <OwnerEmptyReportState message="No store data for this period." />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left text-xs font-medium text-gray-500 uppercase pb-2 pr-4">Store</th>
                <th className="text-right text-xs font-medium text-gray-500 uppercase pb-2 pr-4">Revenue</th>
                <th className="text-right text-xs font-medium text-gray-500 uppercase pb-2 pr-4">Orders</th>
                <th className="text-right text-xs font-medium text-gray-500 uppercase pb-2 pr-4">AOV</th>
                <th className="text-right text-xs font-medium text-gray-500 uppercase pb-2 pr-4">Cancel%</th>
                <th className="text-right text-xs font-medium text-gray-500 uppercase pb-2 pr-4">Channels</th>
                <th className="text-right text-xs font-medium text-gray-500 uppercase pb-2">Active Subs</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {stores.map((store) => (
                <tr key={store.storeId} className="hover:bg-gray-50">
                  <td className="py-2 pr-4 font-medium text-gray-800">{store.storeName}</td>
                  <td className="py-2 pr-4 text-right text-gray-700">
                    {formatMinorCompact(store.revenueMinor)}
                  </td>
                  <td className="py-2 pr-4 text-right text-gray-600">{store.orderCount}</td>
                  <td className="py-2 pr-4 text-right text-gray-600">
                    {formatMinorFull(store.averageOrderValueMinor)}
                  </td>
                  <td className="py-2 pr-4 text-right">
                    <span className={store.cancelledRate > 0.15 ? "text-red-600 font-medium" : "text-gray-600"}>
                      {formatRate(store.cancelledRate)}
                    </span>
                  </td>
                  <td className="py-2 pr-4 text-right text-gray-600">{store.connectedChannelCount}</td>
                  <td className="py-2 text-right text-gray-600">{store.activeSubscriptionCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
