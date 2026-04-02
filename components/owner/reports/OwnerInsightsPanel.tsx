import type { OwnerInsightItem } from "@/types/owner-reports";
import { insightSeverityClasses, insightSeverityIcon } from "@/lib/owner/reports/labels";
import OwnerEmptyReportState from "./OwnerEmptyReportState";

interface Props {
  insights: OwnerInsightItem[];
}

export default function OwnerInsightsPanel({ insights }: Props) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <h2 className="text-base font-semibold text-gray-900 mb-4">Insights</h2>
      {insights.length === 0 ? (
        <OwnerEmptyReportState message="No insights for this period." />
      ) : (
        <div className="space-y-2">
          {insights.map((insight) => (
            <div
              key={insight.key}
              className={`border rounded-lg p-3 ${insightSeverityClasses(insight.severity)}`}
            >
              <div className="flex items-start gap-2">
                <span className="text-base shrink-0 mt-0.5">{insightSeverityIcon(insight.severity)}</span>
                <div>
                  <p className="text-sm font-semibold">{insight.title}</p>
                  <p className="text-xs mt-0.5 opacity-80">{insight.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
