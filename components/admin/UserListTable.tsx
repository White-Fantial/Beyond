import Link from "next/link";
import type { AdminUserListItem } from "@/types/admin";
import StatusBadge from "./StatusBadge";
import AdminEmptyState from "./AdminEmptyState";

interface UserListTableProps {
  items: AdminUserListItem[];
  emptyMessage?: string;
}

export default function UserListTable({ items, emptyMessage }: UserListTableProps) {
  if (items.length === 0) {
    return <AdminEmptyState message={emptyMessage ?? "사용자가 없습니다."} />;
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      <table className="min-w-full divide-y divide-gray-200 text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left font-medium text-gray-500">이름</th>
            <th className="px-4 py-3 text-left font-medium text-gray-500">이메일</th>
            <th className="px-4 py-3 text-left font-medium text-gray-500 hidden sm:table-cell">플랫폼 역할</th>
            <th className="px-4 py-3 text-left font-medium text-gray-500">상태</th>
            <th className="px-4 py-3 text-right font-medium text-gray-500 hidden md:table-cell">테넌트</th>
            <th className="px-4 py-3 text-right font-medium text-gray-500 hidden md:table-cell">매장</th>
            <th className="px-4 py-3 text-left font-medium text-gray-500 hidden lg:table-cell">생성일</th>
            <th className="px-4 py-3"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 bg-white">
          {items.map((u) => (
            <tr key={u.id} className="hover:bg-gray-50">
              <td className="px-4 py-3 font-medium text-gray-900 max-w-[140px] truncate">{u.name}</td>
              <td className="px-4 py-3 text-gray-500 max-w-[180px] truncate">{u.email}</td>
              <td className="px-4 py-3 hidden sm:table-cell">
                <StatusBadge value={u.platformRole} />
              </td>
              <td className="px-4 py-3">
                <StatusBadge value={u.status} />
              </td>
              <td className="px-4 py-3 text-right text-gray-700 hidden md:table-cell">{u.tenantCount}</td>
              <td className="px-4 py-3 text-right text-gray-700 hidden md:table-cell">{u.storeCount}</td>
              <td className="px-4 py-3 text-gray-400 text-xs hidden lg:table-cell">
                {u.createdAt.toLocaleDateString("ko-KR")}
              </td>
              <td className="px-4 py-3 text-right">
                <Link
                  href={`/admin/users/${u.id}`}
                  className="text-xs text-blue-600 hover:underline whitespace-nowrap"
                >
                  상세 →
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
