import Link from "next/link";
import type { AdminTenantListItem } from "@/types/admin";
import StatusBadge from "./StatusBadge";
import AdminEmptyState from "./AdminEmptyState";

interface TenantListTableProps {
  items: AdminTenantListItem[];
  emptyMessage?: string;
}

export default function TenantListTable({ items, emptyMessage }: TenantListTableProps) {
  if (items.length === 0) {
    return <AdminEmptyState message={emptyMessage ?? "테넌트가 없습니다."} />;
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      <table className="min-w-full divide-y divide-gray-200 text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left font-medium text-gray-500">이름</th>
            <th className="px-4 py-3 text-left font-medium text-gray-500">슬러그</th>
            <th className="px-4 py-3 text-left font-medium text-gray-500">상태</th>
            <th className="px-4 py-3 text-left font-medium text-gray-500 hidden md:table-cell">시간대</th>
            <th className="px-4 py-3 text-left font-medium text-gray-500 hidden md:table-cell">통화</th>
            <th className="px-4 py-3 text-right font-medium text-gray-500 hidden sm:table-cell">매장</th>
            <th className="px-4 py-3 text-right font-medium text-gray-500 hidden sm:table-cell">멤버</th>
            <th className="px-4 py-3 text-left font-medium text-gray-500 hidden lg:table-cell">생성일</th>
            <th className="px-4 py-3"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 bg-white">
          {items.map((t) => (
            <tr key={t.id} className="hover:bg-gray-50">
              <td className="px-4 py-3 font-medium text-gray-900 max-w-[160px] truncate">
                {t.displayName}
              </td>
              <td className="px-4 py-3 text-gray-500 font-mono text-xs">{t.slug}</td>
              <td className="px-4 py-3">
                <StatusBadge value={t.status} />
              </td>
              <td className="px-4 py-3 text-gray-500 hidden md:table-cell">{t.timezone}</td>
              <td className="px-4 py-3 text-gray-500 hidden md:table-cell">{t.currency}</td>
              <td className="px-4 py-3 text-right text-gray-700 hidden sm:table-cell">{t.storeCount}</td>
              <td className="px-4 py-3 text-right text-gray-700 hidden sm:table-cell">{t.membershipCount}</td>
              <td className="px-4 py-3 text-gray-400 text-xs hidden lg:table-cell">
                {t.createdAt.toLocaleDateString("ko-KR")}
              </td>
              <td className="px-4 py-3 text-right">
                <Link
                  href={`/admin/tenants/${t.id}`}
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
