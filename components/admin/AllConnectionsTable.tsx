import Link from "next/link";
import StatusBadge from "@/components/admin/StatusBadge";
import AdminEmptyState from "@/components/admin/AdminEmptyState";
import type { AdminConnectionListItem } from "@/types/admin";

interface AllConnectionsTableProps {
  items: AdminConnectionListItem[];
  emptyMessage?: string;
}

export default function AllConnectionsTable({
  items,
  emptyMessage = "연결이 없습니다.",
}: AllConnectionsTableProps) {
  if (items.length === 0) {
    return <AdminEmptyState message={emptyMessage} />;
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      <table className="min-w-full divide-y divide-gray-200 text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left font-medium text-gray-500">매장</th>
            <th className="px-4 py-3 text-left font-medium text-gray-500 hidden sm:table-cell">테넌트</th>
            <th className="px-4 py-3 text-left font-medium text-gray-500">공급자</th>
            <th className="px-4 py-3 text-left font-medium text-gray-500 hidden md:table-cell">유형</th>
            <th className="px-4 py-3 text-left font-medium text-gray-500">상태</th>
            <th className="px-4 py-3 text-left font-medium text-gray-500 hidden lg:table-cell">마지막 연결</th>
            <th className="px-4 py-3 text-left font-medium text-gray-500 hidden lg:table-cell">마지막 동기화</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 bg-white">
          {items.map((c) => (
            <tr key={c.id} className="hover:bg-gray-50">
              <td className="px-4 py-3 font-medium text-gray-900">
                <Link href={`/admin/stores/${c.storeId}`} className="text-blue-600 hover:underline">
                  {c.storeName}
                </Link>
                {c.externalStoreName && (
                  <div className="text-xs text-gray-400 mt-0.5">{c.externalStoreName}</div>
                )}
              </td>
              <td className="px-4 py-3 text-gray-500 hidden sm:table-cell">
                <Link href={`/admin/tenants/${c.tenantId}`} className="text-blue-600 hover:underline">
                  {c.tenantDisplayName}
                </Link>
              </td>
              <td className="px-4 py-3 text-gray-700 font-mono text-xs">{c.provider}</td>
              <td className="px-4 py-3 text-gray-500 hidden md:table-cell font-mono text-xs">{c.type}</td>
              <td className="px-4 py-3"><StatusBadge value={c.status} /></td>
              <td className="px-4 py-3 text-gray-400 text-xs hidden lg:table-cell">
                {c.lastConnectedAt ? c.lastConnectedAt.toLocaleString("ko-KR") : "—"}
              </td>
              <td className="px-4 py-3 text-gray-400 text-xs hidden lg:table-cell">
                {c.lastSyncAt ? c.lastSyncAt.toLocaleString("ko-KR") : "—"}
                {c.lastSyncStatus && (
                  <span className="ml-1">
                    <StatusBadge value={c.lastSyncStatus} />
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
