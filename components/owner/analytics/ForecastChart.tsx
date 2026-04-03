import type { ForecastData } from "@/types/owner-analytics";
import { formatMinorCompact } from "@/lib/owner/reports/labels";

interface Props {
  data: ForecastData;
}

export default function ForecastChart({ data }: Props) {
  if (data.points.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6 text-center">
        <p className="text-sm font-medium text-gray-600">No forecast data available</p>
        <p className="text-xs text-gray-400 mt-1">More order history is needed to generate a forecast.</p>
      </div>
    );
  }

  const chartHeight = 140;
  const chartPaddingTop = 10;
  const labelHeight = 24;

  const allValues = data.points.flatMap((p) => [p.lower, p.upper, p.actual ?? 0]);
  const maxValue = Math.max(...allValues, 1);

  const barWidth = Math.max(6, Math.min(32, Math.floor(560 / data.points.length) - 3));
  const gap = 3;
  const chartWidth = data.points.length * (barWidth + gap);

  const scaleY = (v: number) =>
    chartHeight - Math.round((v / maxValue) * (chartHeight - chartPaddingTop));

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-base font-semibold text-gray-900">Revenue Forecast</h2>
        <span className="text-xs text-gray-400">
          {data.horizon}-day horizon · projected {formatMinorCompact(data.projectedTotalMinor, data.currencyCode)}
        </span>
      </div>
      <p className="text-xs text-gray-400 mb-4">Shaded band = 80% confidence interval</p>

      <div className="overflow-x-auto">
        <svg
          width={Math.max(chartWidth, 320)}
          height={chartHeight + labelHeight}
          aria-label="Revenue forecast chart"
          role="img"
        >
          {data.points.map((pt, i) => {
            const x = i * (barWidth + gap);
            const isFuture = pt.date > today;
            const yPredicted = scaleY(pt.predicted);
            const yLower = scaleY(pt.lower);
            const yActual = pt.actual !== null ? scaleY(pt.actual) : null;
            const bandHeight = Math.max(1, yLower - scaleY(pt.upper));
            const bandY = scaleY(pt.upper);

            return (
              <g key={pt.date}>
                {/* Confidence band */}
                <rect
                  x={x}
                  y={bandY}
                  width={barWidth}
                  height={bandHeight}
                  fill={isFuture ? "#e0e7ff" : "#f3f4f6"}
                  rx={1}
                  opacity={0.7}
                />

                {/* Predicted line marker */}
                <rect
                  x={x}
                  y={yPredicted - 1}
                  width={barWidth}
                  height={2}
                  fill={isFuture ? "#6366f1" : "#a5b4fc"}
                  rx={1}
                  aria-label={`${pt.date} predicted: ${formatMinorCompact(pt.predicted, data.currencyCode)}`}
                />

                {/* Actual value bar (historical) */}
                {yActual !== null && (
                  <rect
                    x={x + 2}
                    y={yActual}
                    width={barWidth - 4}
                    height={chartHeight - yActual}
                    fill="#818cf8"
                    rx={1}
                    opacity={0.8}
                    aria-label={`${pt.date} actual: ${formatMinorCompact(pt.actual ?? 0, data.currencyCode)}`}
                  />
                )}

                {/* Date label — every 3rd point */}
                {i % Math.max(1, Math.ceil(data.points.length / 10)) === 0 && (
                  <text
                    x={x + barWidth / 2}
                    y={chartHeight + 16}
                    textAnchor="middle"
                    fontSize={8}
                    fill="#9ca3af"
                  >
                    {pt.date.slice(5)}
                  </text>
                )}
              </g>
            );
          })}

          {/* Today line */}
          {data.points.some((p) => p.date === today) && (() => {
            const idx = data.points.findIndex((p) => p.date === today);
            const x = idx * (barWidth + gap) + barWidth / 2;
            return (
              <line
                x1={x}
                x2={x}
                y1={0}
                y2={chartHeight}
                stroke="#f97316"
                strokeWidth={1}
                strokeDasharray="3 3"
                opacity={0.6}
              />
            );
          })()}
        </svg>
      </div>

      <div className="flex flex-wrap items-center gap-4 mt-2">
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-2 rounded-sm" style={{ backgroundColor: "#818cf8" }} />
          <span className="text-xs text-gray-500">Actual</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-0.5 rounded-sm" style={{ backgroundColor: "#6366f1" }} />
          <span className="text-xs text-gray-500">Predicted</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-3 rounded-sm" style={{ backgroundColor: "#e0e7ff" }} />
          <span className="text-xs text-gray-500">80% CI</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-px border-t border-dashed border-orange-400" />
          <span className="text-xs text-gray-500">Today</span>
        </div>
      </div>
    </div>
  );
}
