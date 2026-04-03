import type { BackofficePeakHourCell } from "@/types/backoffice";

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

// Show label every 3 hours
const HOUR_LABELS = Array.from({ length: 24 }, (_, h) => {
  if (h === 0) return "12a";
  if (h < 12) return h % 3 === 0 ? `${h}a` : "";
  if (h === 12) return "12p";
  return (h - 12) % 3 === 0 ? `${h - 12}p` : "";
});

function cellColour(count: number, max: number): string {
  if (max === 0 || count === 0) return "#f3f4f6";
  const ratio = count / max;
  if (ratio < 0.2) return "#e0e7ff";
  if (ratio < 0.4) return "#c7d2fe";
  if (ratio < 0.6) return "#a5b4fc";
  if (ratio < 0.8) return "#818cf8";
  return "#6366f1";
}

function textColour(count: number, max: number): string {
  if (max === 0 || count === 0) return "#9ca3af";
  return count / max >= 0.6 ? "#ffffff" : "#3730a3";
}

interface Props {
  cells: BackofficePeakHourCell[];
  maxCount: number;
}

export default function ReportsPeakHoursGrid({ cells, maxCount }: Props) {
  if (maxCount === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6 text-center">
        <p className="text-sm text-gray-500">No order data available for peak-hour analysis.</p>
      </div>
    );
  }

  // Build lookup grid[weekday][hour]
  const grid: number[][] = Array.from({ length: 7 }, () => new Array(24).fill(0));
  for (const cell of cells) {
    grid[cell.weekday][cell.hour] = cell.orderCount;
  }

  const cellSize = 26;
  const labelColWidth = 34;
  const labelRowHeight = 18;
  const gap = 2;

  const svgWidth = labelColWidth + 24 * (cellSize + gap);
  const svgHeight = labelRowHeight + 7 * (cellSize + gap);

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <h2 className="text-base font-semibold text-gray-900 mb-4">
        Peak Hours Heatmap
      </h2>
      <div className="overflow-x-auto">
        <svg
          width={svgWidth}
          height={svgHeight}
          aria-label="Peak hours heatmap by weekday and hour"
          role="img"
        >
          {/* Hour labels */}
          {HOUR_LABELS.map((label, h) => {
            if (!label) return null;
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
          {WEEKDAY_LABELS.map((wd, wi) => (
            <g key={wd}>
              <text
                x={labelColWidth - 4}
                y={labelRowHeight + wi * (cellSize + gap) + cellSize / 2 + 4}
                textAnchor="end"
                fontSize={9}
                fill="#6b7280"
              >
                {wd}
              </text>
              {Array.from({ length: 24 }, (_, h) => {
                const count = grid[wi][h];
                const cx = labelColWidth + h * (cellSize + gap);
                const cy = labelRowHeight + wi * (cellSize + gap);
                return (
                  <g key={h}>
                    <rect
                      x={cx}
                      y={cy}
                      width={cellSize}
                      height={cellSize}
                      fill={cellColour(count, maxCount)}
                      rx={3}
                    >
                      <title>
                        {wd} {h}:00 — {count} orders
                      </title>
                    </rect>
                    {count > 0 && (
                      <text
                        x={cx + cellSize / 2}
                        y={cy + cellSize / 2 + 4}
                        textAnchor="middle"
                        fontSize={8}
                        fill={textColour(count, maxCount)}
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
    </div>
  );
}
