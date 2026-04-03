import type { HeatmapData } from "@/types/owner-analytics";

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
const HOUR_LABELS = ["12a", "1a", "2a", "3a", "4a", "5a", "6a", "7a", "8a", "9a", "10a", "11a",
  "12p", "1p", "2p", "3p", "4p", "5p", "6p", "7p", "8p", "9p", "10p", "11p"] as const;

interface Props {
  data: HeatmapData;
}

function cellColour(count: number, max: number): string {
  if (max === 0 || count === 0) return "#f3f4f6"; // gray-100
  const ratio = count / max;
  if (ratio < 0.2) return "#e0e7ff"; // indigo-100
  if (ratio < 0.4) return "#c7d2fe"; // indigo-200
  if (ratio < 0.6) return "#a5b4fc"; // indigo-300
  if (ratio < 0.8) return "#818cf8"; // indigo-400
  return "#6366f1"; // indigo-500
}

function textColour(count: number, max: number): string {
  if (max === 0 || count === 0) return "#9ca3af";
  const ratio = count / max;
  return ratio >= 0.6 ? "#ffffff" : "#3730a3";
}

export default function HeatmapChart({ data }: Props) {
  if (data.totalOrders === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6 text-center">
        <p className="text-sm font-medium text-gray-600">No order data available</p>
        <p className="text-xs text-gray-400 mt-1">Adjust your date range to see the heatmap.</p>
      </div>
    );
  }

  // Build quick lookup: weekday → hour → count
  const grid: number[][] = Array.from({ length: 7 }, () => new Array(24).fill(0));
  for (const cell of data.cells) {
    grid[cell.weekday][cell.hour] = cell.orderCount;
  }

  const cellSize = 28;
  const labelColWidth = 36;
  const labelRowHeight = 20;
  const gap = 2;

  const svgWidth = labelColWidth + 24 * (cellSize + gap);
  const svgHeight = labelRowHeight + 7 * (cellSize + gap);

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-base font-semibold text-gray-900">Order Volume Heatmap</h2>
        <span className="text-xs text-gray-400">{data.totalOrders.toLocaleString()} orders</span>
      </div>
      <p className="text-xs text-gray-400 mb-4">
        Peak: {WEEKDAY_LABELS[data.peakWeekday]}s at {HOUR_LABELS[data.peakHour]}
      </p>
      <div className="overflow-x-auto">
        <svg
          width={svgWidth}
          height={svgHeight}
          aria-label="Order volume heatmap by weekday and hour"
          role="img"
        >
          {/* Hour labels */}
          {HOUR_LABELS.map((label, h) => {
            if (h % 3 !== 0) return null;
            return (
              <text
                key={h}
                x={labelColWidth + h * (cellSize + gap) + cellSize / 2}
                y={labelRowHeight - 4}
                textAnchor="middle"
                fontSize={8}
                fill="#9ca3af"
              >
                {label}
              </text>
            );
          })}

          {/* Weekday rows */}
          {WEEKDAY_LABELS.map((dayLabel, wd) => (
            <g key={wd}>
              {/* Row label */}
              <text
                x={labelColWidth - 4}
                y={labelRowHeight + wd * (cellSize + gap) + cellSize / 2 + 4}
                textAnchor="end"
                fontSize={9}
                fill="#6b7280"
              >
                {dayLabel}
              </text>

              {/* Cells */}
              {grid[wd].map((count, h) => {
                const x = labelColWidth + h * (cellSize + gap);
                const y = labelRowHeight + wd * (cellSize + gap);
                const bg = cellColour(count, data.maxCount);
                const fg = textColour(count, data.maxCount);
                return (
                  <g key={h}>
                    <rect
                      x={x}
                      y={y}
                      width={cellSize}
                      height={cellSize}
                      rx={3}
                      fill={bg}
                      aria-label={`${dayLabel} ${HOUR_LABELS[h]}: ${count} orders`}
                    />
                    {count > 0 && (
                      <text
                        x={x + cellSize / 2}
                        y={y + cellSize / 2 + 4}
                        textAnchor="middle"
                        fontSize={8}
                        fill={fg}
                      >
                        {count}
                      </text>
                    )}
                  </g>
                );
              })}
            </g>
          ))}
        </svg>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-2 mt-3">
        <span className="text-xs text-gray-400">Low</span>
        {["#e0e7ff", "#c7d2fe", "#a5b4fc", "#818cf8", "#6366f1"].map((c) => (
          <div key={c} className="w-5 h-3 rounded-sm" style={{ backgroundColor: c }} />
        ))}
        <span className="text-xs text-gray-400">High</span>
      </div>
    </div>
  );
}
