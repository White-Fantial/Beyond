import type { BackofficeDailyPoint } from "@/types/backoffice";

function currencySymbol(code: string): string {
  const map: Record<string, string> = { NZD: "$", AUD: "$", USD: "$", GBP: "£", EUR: "€" };
  return map[code] ?? `${code} `;
}

interface Props {
  series: BackofficeDailyPoint[];
  currencyCode: string;
}

export default function ReportsDailyChart({ series, currencyCode }: Props) {
  if (series.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6 text-center">
        <p className="text-sm text-gray-500">No order data for this period.</p>
      </div>
    );
  }

  const maxRevenue = Math.max(...series.map((s) => s.revenueMinor), 1);
  const maxOrders = Math.max(...series.map((s) => s.orderCount), 1);
  const sym = currencySymbol(currencyCode);

  const chartH = 120;
  const chartW = Math.max(series.length * 20, 300);
  const barW = Math.max(Math.floor(chartW / series.length) - 2, 4);

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <h2 className="text-base font-semibold text-gray-900 mb-4">
        Daily Orders &amp; Revenue
      </h2>
      <div className="overflow-x-auto">
        <svg
          width={chartW}
          height={chartH + 24}
          aria-label="Daily orders and revenue chart"
          role="img"
        >
          {series.map((point, i) => {
            const revH = Math.round((point.revenueMinor / maxRevenue) * chartH);
            const ordH = Math.round((point.orderCount / maxOrders) * chartH);
            const x = i * (chartW / series.length);
            return (
              <g key={point.dateKey}>
                {/* Revenue bar */}
                <rect
                  x={x + 1}
                  y={chartH - revH}
                  width={barW}
                  height={revH}
                  fill="#6366f1"
                  opacity={0.7}
                  rx={2}
                >
                  <title>
                    {point.dateLabel}: {sym}{(point.revenueMinor / 100).toFixed(2)} revenue
                  </title>
                </rect>
                {/* Order count dot */}
                <circle
                  cx={x + barW / 2 + 1}
                  cy={chartH - ordH}
                  r={3}
                  fill="#22c55e"
                >
                  <title>
                    {point.dateLabel}: {point.orderCount} orders
                  </title>
                </circle>
              </g>
            );
          })}
        </svg>
      </div>
      <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded-sm bg-indigo-500 opacity-70" />
          Revenue
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded-full bg-green-500" />
          Orders
        </span>
      </div>
    </div>
  );
}
