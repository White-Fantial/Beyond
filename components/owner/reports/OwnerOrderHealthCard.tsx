import type { OwnerOrderHealthSummary } from "@/types/owner-reports";
import { formatRate } from "@/lib/owner/reports/labels";
import OwnerEmptyReportState from "./OwnerEmptyReportState";

interface Props {
  health: OwnerOrderHealthSummary;
}

export default function OwnerOrderHealthCard({ health }: Props) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <h2 className="text-base font-semibold text-gray-900 mb-4">Order Health</h2>
      {health.totalOrders === 0 ? (
        <OwnerEmptyReportState message="No orders in this period." />
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            <div className="bg-gray-50 rounded-lg p-3 text-center">
              <div className="text-xs text-gray-500 mb-0.5">Total</div>
              <div className="text-xl font-bold text-gray-900">{health.totalOrders}</div>
            </div>
            <div className="bg-green-50 rounded-lg p-3 text-center">
              <div className="text-xs text-green-600 mb-0.5">Completed</div>
              <div className="text-xl font-bold text-green-700">{health.completedOrders}</div>
              <div className="text-xs text-green-500">{formatRate(health.completedRate)}</div>
            </div>
            <div className="bg-red-50 rounded-lg p-3 text-center">
              <div className="text-xs text-red-500 mb-0.5">Cancelled</div>
              <div className="text-xl font-bold text-red-600">{health.cancelledOrders}</div>
              <div className="text-xs text-red-400">{formatRate(health.cancelledRate)}</div>
            </div>
            <div className="bg-orange-50 rounded-lg p-3 text-center">
              <div className="text-xs text-orange-500 mb-0.5">Failed</div>
              <div className="text-xl font-bold text-orange-600">{health.failedOrders}</div>
              <div className="text-xs text-orange-400">{formatRate(health.failedRate)}</div>
            </div>
          </div>
          {/* Stacked bar */}
          <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden flex">
            <div
              className="bg-green-500 h-full"
              style={{ width: `${(health.completedRate * 100).toFixed(1)}%` }}
            />
            <div
              className="bg-red-400 h-full"
              style={{ width: `${(health.cancelledRate * 100).toFixed(1)}%` }}
            />
            <div
              className="bg-orange-400 h-full"
              style={{ width: `${(health.failedRate * 100).toFixed(1)}%` }}
            />
          </div>
          <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500 inline-block" /> Completed</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400 inline-block" /> Cancelled</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-400 inline-block" /> Failed</span>
          </div>
        </>
      )}
    </div>
  );
}
