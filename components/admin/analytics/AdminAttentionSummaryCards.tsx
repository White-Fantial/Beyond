import Link from "next/link";
import type { AdminAttentionSummary, AdminAttentionSeverity } from "@/types/admin-analytics";

interface Props {
  summary: AdminAttentionSummary;
}

function severityStyles(severity: AdminAttentionSeverity) {
  switch (severity) {
    case "critical":
      return {
        card: "border-red-200 bg-red-50",
        badge: "bg-red-600 text-white",
        title: "text-red-800",
        desc: "text-red-700",
        link: "text-red-700 hover:text-red-900 underline",
      };
    case "warning":
      return {
        card: "border-yellow-200 bg-yellow-50",
        badge: "bg-yellow-500 text-white",
        title: "text-yellow-800",
        desc: "text-yellow-700",
        link: "text-yellow-700 hover:text-yellow-900 underline",
      };
    default:
      return {
        card: "border-blue-200 bg-blue-50",
        badge: "bg-blue-500 text-white",
        title: "text-blue-800",
        desc: "text-blue-700",
        link: "text-blue-700 hover:text-blue-900 underline",
      };
  }
}

export default function AdminAttentionSummaryCards({ summary }: Props) {
  if (summary.items.length === 0) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
        <div className="flex items-center gap-2">
          <span className="text-green-600 text-lg">✓</span>
          <div>
            <p className="text-sm font-semibold text-green-800">현재 주목할 이슈가 없습니다</p>
            <p className="text-xs text-green-600">플랫폼이 정상 운영 중입니다.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-6">
      <div className="flex items-center gap-3 mb-3">
        <h2 className="text-sm font-semibold text-gray-700">운영 주의 사항</h2>
        <div className="flex gap-2">
          {summary.critical > 0 && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-red-600 text-white">
              긴급 {summary.critical}
            </span>
          )}
          {summary.warning > 0 && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-yellow-500 text-white">
              경고 {summary.warning}
            </span>
          )}
          {summary.info > 0 && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-blue-500 text-white">
              정보 {summary.info}
            </span>
          )}
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {summary.items.map((item) => {
          const styles = severityStyles(item.severity);
          return (
            <div
              key={item.type}
              className={`rounded-lg border p-4 ${styles.card}`}
            >
              <div className="flex items-start justify-between gap-2 mb-1">
                <p className={`text-sm font-semibold ${styles.title}`}>{item.title}</p>
                <span
                  className={`inline-flex items-center justify-center min-w-[24px] h-6 px-1.5 rounded-full text-xs font-bold ${styles.badge}`}
                >
                  {item.count}
                </span>
              </div>
              <p className={`text-xs mb-2 ${styles.desc}`}>{item.description}</p>
              <Link href={item.href} className={`text-xs font-medium ${styles.link}`}>
                바로가기 →
              </Link>
            </div>
          );
        })}
      </div>
    </div>
  );
}
