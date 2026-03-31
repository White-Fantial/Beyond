import StatusBadge from "@/components/admin/StatusBadge";
import AdminEmptyState from "@/components/admin/AdminEmptyState";
import type { AdminConnectionActionLogItem } from "@/types/admin";

interface ConnectionActionLogTableProps {
  items: AdminConnectionActionLogItem[];
  emptyMessage?: string;
}

export default function ConnectionActionLogTable({
  items,
  emptyMessage = "작업 로그가 없습니다.",
}: ConnectionActionLogTableProps) {
  if (items.length === 0) {
    return <AdminEmptyState message={emptyMessage} />;
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      <table className="min-w-full divide-y divide-gray-200 text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left font-medium text-gray-500">시간</th>
            <th className="px-4 py-3 text-left font-medium text-gray-500">공급자</th>
            <th className="px-4 py-3 text-left font-medium text-gray-500 hidden sm:table-cell">작업 유형</th>
            <th className="px-4 py-3 text-left font-medium text-gray-500">상태</th>
            <th className="px-4 py-3 text-left font-medium text-gray-500 hidden md:table-cell">메시지</th>
            <th className="px-4 py-3 text-left font-medium text-gray-500 hidden lg:table-cell">오류 코드</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 bg-white">
          {items.map((l) => (
            <tr key={l.id} className="hover:bg-gray-50">
              <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                {l.createdAt.toLocaleString("ko-KR")}
              </td>
              <td className="px-4 py-3 font-mono text-xs text-gray-700">{l.provider}</td>
              <td className="px-4 py-3 font-mono text-xs text-gray-500 hidden sm:table-cell">
                {l.actionType}
              </td>
              <td className="px-4 py-3">
                <StatusBadge value={l.status} />
              </td>
              <td className="px-4 py-3 text-xs text-gray-500 hidden md:table-cell truncate max-w-[200px]">
                {l.message ?? "—"}
              </td>
              <td className="px-4 py-3 text-xs text-red-500 hidden lg:table-cell">
                {l.errorCode ?? "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
