import type { OwnerSoldOutImpactSummary } from "@/types/owner-reports";
import OwnerEmptyReportState from "./OwnerEmptyReportState";

interface Props {
  impact: OwnerSoldOutImpactSummary;
}

export default function OwnerSoldOutImpactCard({ impact }: Props) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <h2 className="text-base font-semibold text-gray-900 mb-4">Sold-Out Impact</h2>
      {impact.soldOutProductCount === 0 && impact.soldOutOptionCount === 0 ? (
        <OwnerEmptyReportState message="No sold-out items currently." />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-orange-50 rounded-lg p-3">
              <div className="text-xs text-orange-600 mb-0.5">Sold-Out Products</div>
              <div className="text-xl font-bold text-orange-700">{impact.soldOutProductCount}</div>
            </div>
            <div className="bg-orange-50 rounded-lg p-3">
              <div className="text-xs text-orange-600 mb-0.5">Sold-Out Options</div>
              <div className="text-xl font-bold text-orange-700">{impact.soldOutOptionCount}</div>
            </div>
          </div>
          {impact.topSoldOutProducts.length > 0 && (
            <>
              <p className="text-xs text-gray-500 mb-2">Top sold-out products with recent sales:</p>
              <div className="space-y-1.5">
                {impact.topSoldOutProducts.map((p) => (
                  <div key={p.productId} className="flex items-center justify-between bg-red-50 rounded-lg px-3 py-2">
                    <span className="text-sm font-medium text-gray-800">{p.productName}</span>
                    <span className="text-xs text-red-600 font-medium">{p.recentSales} recent sales</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
