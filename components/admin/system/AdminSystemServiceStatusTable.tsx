import type { AdminSystemComponentHealth } from "@/types/admin-system";
import { healthStatusLabel } from "@/lib/admin/system/labels";
import { healthStatusColor } from "@/lib/admin/system/health";
import Link from "next/link";

interface AdminSystemServiceStatusTableProps {
  components: AdminSystemComponentHealth[];
}

export function AdminSystemServiceStatusTable({
  components,
}: AdminSystemServiceStatusTableProps) {
  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
          <tr>
            <th className="px-4 py-2 text-left">서비스</th>
            <th className="px-4 py-2 text-left">상태</th>
            <th className="px-4 py-2 text-left">요약</th>
            <th className="px-4 py-2 text-left">마지막 체크</th>
            <th className="px-4 py-2 text-left">상세</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {components.map((c) => {
            const colors = healthStatusColor(c.status);
            return (
              <tr key={c.key} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-800">
                  {c.label}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${colors.bg} ${colors.text}`}
                  >
                    <span className={`h-1.5 w-1.5 rounded-full ${colors.dot}`} />
                    {healthStatusLabel(c.status)}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-gray-600 max-w-xs truncate">
                  {c.summary}
                </td>
                <td className="px-4 py-3 text-xs text-gray-400">
                  {c.lastCheckedAt
                    ? new Date(c.lastCheckedAt).toLocaleTimeString("ko-KR")
                    : "—"}
                </td>
                <td className="px-4 py-3">
                  {c.drilldownHref ? (
                    <Link
                      href={c.drilldownHref}
                      className="text-xs text-blue-600 hover:underline"
                    >
                      보기
                    </Link>
                  ) : (
                    <span className="text-xs text-gray-300">—</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
