import type { AdminTrendPoint } from "@/types/admin-analytics";

interface Props {
  data: AdminTrendPoint[];
  currencyCode?: string;
  summary?: string;
}

export default function AdminTrendChart({ data, currencyCode = "NZD", summary }: Props) {
  if (data.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-5 mb-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">주문 / 매출 추세</h2>
        <p className="text-xs text-gray-400 py-8 text-center">기간 내 데이터가 없습니다.</p>
      </div>
    );
  }

  const maxOrders = Math.max(...data.map((d) => d.totalOrders), 1);
  const maxRevenue = Math.max(...data.map((d) => d.grossSales), 1);

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-5 mb-6">
      <h2 className="text-sm font-semibold text-gray-700 mb-4">주문 / 매출 추세</h2>
      {/* Orders chart */}
      <div className="mb-6">
        <div className="text-xs text-gray-500 mb-2">일별 주문 수</div>
        <div className="flex items-end gap-1 h-24 overflow-x-auto">
          {data.map((d) => (
            <div
              key={d.date}
              className="flex flex-col items-center gap-0.5 min-w-[20px] flex-1"
              title={`${d.date}: 전체 ${d.totalOrders}건, 완료 ${d.completedOrders}건`}
            >
              <div className="flex flex-col justify-end h-20 w-full gap-0.5">
                <div
                  className="bg-blue-200 w-full rounded-t"
                  style={{ height: `${Math.max((d.totalOrders / maxOrders) * 80, 2)}px` }}
                />
                <div
                  className="bg-blue-500 w-full rounded-t"
                  style={{ height: `${Math.max((d.completedOrders / maxOrders) * 80, 1)}px` }}
                />
              </div>
              <span className="text-[9px] text-gray-400 rotate-45 origin-left block mt-1 hidden sm:block">
                {d.date.slice(5)}
              </span>
            </div>
          ))}
        </div>
        <div className="flex gap-3 mt-2 text-xs">
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-2 bg-blue-200 rounded" />전체
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-2 bg-blue-500 rounded" />완료
          </span>
        </div>
      </div>

      {/* Revenue chart */}
      <div>
        <div className="text-xs text-gray-500 mb-2">일별 매출 ({currencyCode})</div>
        <div className="flex items-end gap-1 h-24 overflow-x-auto">
          {data.map((d) => (
            <div
              key={d.date}
              className="flex flex-col items-center gap-0.5 min-w-[20px] flex-1"
              title={`${d.date}: ${(d.grossSales / 100).toLocaleString("ko-KR")} ${currencyCode}`}
            >
              <div className="flex flex-col justify-end h-20 w-full">
                <div
                  className="bg-green-400 w-full rounded-t"
                  style={{ height: `${Math.max((d.grossSales / maxRevenue) * 80, d.grossSales > 0 ? 2 : 0)}px` }}
                />
              </div>
              <span className="text-[9px] text-gray-400 rotate-45 origin-left block mt-1 hidden sm:block">
                {d.date.slice(5)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {summary && (
        <p className="text-xs text-gray-500 mt-4 italic">{summary}</p>
      )}
    </div>
  );
}
