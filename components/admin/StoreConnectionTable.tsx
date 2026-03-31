import type { StoreConnectionRow } from "@/types/admin";
import StatusBadge from "./StatusBadge";
import AdminEmptyState from "./AdminEmptyState";

interface StoreConnectionTableProps {
  connections: StoreConnectionRow[];
}

export default function StoreConnectionTable({ connections }: StoreConnectionTableProps) {
  if (connections.length === 0) {
    return <AdminEmptyState message="연결 정보가 없습니다." />;
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      <table className="min-w-full divide-y divide-gray-200 text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left font-medium text-gray-500">제공자</th>
            <th className="px-4 py-3 text-left font-medium text-gray-500 hidden sm:table-cell">유형</th>
            <th className="px-4 py-3 text-left font-medium text-gray-500">상태</th>
            <th className="px-4 py-3 text-left font-medium text-gray-500 hidden md:table-cell">인증 방식</th>
            <th className="px-4 py-3 text-left font-medium text-gray-500 hidden md:table-cell">외부 매장명</th>
            <th className="px-4 py-3 text-left font-medium text-gray-500 hidden lg:table-cell">마지막 연결</th>
            <th className="px-4 py-3 text-left font-medium text-gray-500 hidden lg:table-cell">마지막 동기화</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 bg-white">
          {connections.map((c) => (
            <tr key={c.id} className="hover:bg-gray-50">
              <td className="px-4 py-3 font-medium text-gray-900">{c.provider}</td>
              <td className="px-4 py-3 text-gray-500 hidden sm:table-cell">{c.type}</td>
              <td className="px-4 py-3">
                <StatusBadge value={c.status} />
              </td>
              <td className="px-4 py-3 text-gray-500 hidden md:table-cell">{c.authScheme ?? "—"}</td>
              <td className="px-4 py-3 text-gray-500 hidden md:table-cell max-w-[160px] truncate">
                {c.externalStoreName ?? "—"}
              </td>
              <td className="px-4 py-3 text-gray-400 text-xs hidden lg:table-cell">
                {c.lastConnectedAt ? c.lastConnectedAt.toLocaleDateString("ko-KR") : "—"}
              </td>
              <td className="px-4 py-3 text-gray-400 text-xs hidden lg:table-cell">
                {c.lastSyncAt ? c.lastSyncAt.toLocaleDateString("ko-KR") : "—"}
                {c.lastSyncStatus && (
                  <span className="ml-1 text-gray-400">({c.lastSyncStatus})</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
