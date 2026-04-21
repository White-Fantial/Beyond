import type { OwnerProductPerformanceItem } from "@/types/owner-reports";
import { formatMinorCompact } from "@/lib/owner/reports/labels";
import OwnerEmptyReportState from "./OwnerEmptyReportState";

interface Props {
  products: OwnerProductPerformanceItem[];
  title?: string;
}

export default function OwnerProductPerformanceTable({ products, title = "Top Products" }: Props) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <h2 className="text-base font-semibold text-gray-900 mb-4">{title}</h2>
      {products.length === 0 ? (
        <OwnerEmptyReportState message="No product sales data for this period." />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left text-xs font-medium text-gray-500 uppercase pb-2 pr-4">Product</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase pb-2 pr-4 hidden sm:table-cell">Category</th>
                <th className="text-right text-xs font-medium text-gray-500 uppercase pb-2 pr-4">Qty Sold</th>
                <th className="text-right text-xs font-medium text-gray-500 uppercase pb-2 pr-4">Revenue</th>
                <th className="text-right text-xs font-medium text-gray-500 uppercase pb-2">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {products.map((product) => (
                <tr key={product.productId} className="hover:bg-gray-50">
                  <td className="py-2 pr-4">
                    <span className="font-medium text-gray-800">{product.productName}</span>
                    {product.isSubscriptionEligible && (
                      <span className="ml-1 text-xs text-purple-600">🔄</span>
                    )}
                  </td>
                  <td className="py-2 pr-4 text-gray-500 hidden sm:table-cell">
                    {product.categoryName ?? "—"}
                  </td>
                  <td className="py-2 pr-4 text-right text-gray-700">{product.quantitySold}</td>
                  <td className="py-2 pr-4 text-right text-gray-700">
                    {formatMinorCompact(product.revenueMinor)}
                  </td>
                  <td className="py-2 text-right">
                    {product.soldOutFlag ? (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-700">
                        Sold Out
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700">
                        Available
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
