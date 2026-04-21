import type { OwnerCategoryPerformanceItem } from "@/types/owner-reports";
import { formatMinorCompact } from "@/lib/owner/reports/labels";
import OwnerEmptyReportState from "./OwnerEmptyReportState";

interface Props {
  categories: OwnerCategoryPerformanceItem[];
}

export default function OwnerCategoryPerformanceTable({ categories }: Props) {
  const totalRevenue = categories.reduce((s, c) => s + c.revenueMinor, 0) || 1;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <h2 className="text-base font-semibold text-gray-900 mb-4">Category Performance</h2>
      {categories.length === 0 ? (
        <OwnerEmptyReportState message="No category sales data for this period." />
      ) : (
        <div className="space-y-3">
          {categories.map((cat) => {
            const pct = (cat.revenueMinor / totalRevenue) * 100;
            return (
              <div key={cat.categoryId}>
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-sm font-medium text-gray-700">{cat.categoryName}</span>
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    <span>{cat.quantitySold} units</span>
                    <span>{cat.orderCount} orders</span>
                    <span className="font-medium text-gray-800">
                      {formatMinorCompact(cat.revenueMinor)}
                    </span>
                  </div>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-indigo-400 rounded-full"
                    style={{ width: `${pct.toFixed(1)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
