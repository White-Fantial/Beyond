import Link from "next/link";
import type { AdminProblemStoreRow } from "@/types/admin-analytics";

interface Props {
  rows: AdminProblemStoreRow[];
}

const LABEL_MAP: Record<string, string> = {
  REAUTH_REQUIRED: "Re-authenticate",
  SYNC_FAILED: "Sync 실패",
  WEBHOOK_ERRORS: "Webhook Error",
  POS_FAILED: "POS Failed",
  FAILED_JOBS: "Failed Jobs",
};

function getLabelColor(label: string): string {
  switch (label) {
    case "REAUTH_REQUIRED": return "bg-red-100 text-red-700";
    case "SYNC_FAILED": return "bg-yellow-100 text-yellow-700";
    case "WEBHOOK_ERRORS": return "bg-orange-100 text-orange-700";
    case "POS_FAILED": return "bg-purple-100 text-purple-700";
    default: return "bg-gray-100 text-gray-600";
  }
}

export default function AdminProblemStoresTable({ rows }: Props) {
  if (rows.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-5 mb-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Top Problem Stores</h2>
        <p className="text-xs text-gray-400 py-4 text-center">No problem stores at this time.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-5 mb-6">
      <h2 className="text-sm font-semibold text-gray-700 mb-3">Top {rows.length}</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-gray-400 border-b border-gray-100">
              <th className="text-left pb-2 font-medium">Store</th>
              <th className="text-left pb-2 font-medium">Tenant</th>
              <th className="text-right pb-2 font-medium">Score</th>
              <th className="text-left pb-2 font-medium">Main Issue</th>
              <th className="text-right pb-2 font-medium">Link</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.storeId} className="border-b border-gray-50 last:border-0">
                <td className="py-2.5">
                  <Link
                    href={`/admin/stores/${r.storeId}`}
                    className="font-medium text-gray-900 hover:underline"
                  >
                    {r.storeName}
                  </Link>
                </td>
                <td className="py-2.5 text-gray-500 text-xs">{r.tenantDisplayName}</td>
                <td className="py-2.5 text-right">
                  <span
                    className={`inline-flex items-center justify-center w-8 h-6 rounded text-xs font-bold ${
                      r.problemScore >= 10
                        ? "bg-red-100 text-red-700"
                        : r.problemScore >= 5
                        ? "bg-yellow-100 text-yellow-700"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {r.problemScore}
                  </span>
                </td>
                <td className="py-2.5">
                  <div className="flex flex-wrap gap-1">
                    {r.labels.map((l) => (
                      <span
                        key={l}
                        className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${getLabelColor(l)}`}
                      >
                        {LABEL_MAP[l] ?? l}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="py-2.5 text-right">
                  <div className="flex justify-end gap-2 text-xs">
                    <Link
                      href={`/admin/stores/${r.storeId}`}
                      className="text-blue-600 hover:underline"
                    >
                      Store
                    </Link>
                    <Link
                      href={`/admin/integrations?storeId=${r.storeId}`}
                      className="text-blue-600 hover:underline"
                    >
                      연동
                    </Link>
                    <Link
                      href={`/admin/logs?storeId=${r.storeId}`}
                      className="text-blue-600 hover:underline"
                    >
                      로그
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length >= 2 && (
        <p className="text-xs text-gray-400 mt-3 italic">
          상위 {Math.min(2, rows.length)} more Store이 플랫폼 All 문제의 상당 부분을 차지하고 있습니다.
        </p>
      )}
    </div>
  );
}
