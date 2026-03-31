import type { TenantMembershipRow } from "@/types/admin";
import StatusBadge from "./StatusBadge";
import AdminEmptyState from "./AdminEmptyState";

interface MembershipTableProps {
  memberships: TenantMembershipRow[];
}

export default function MembershipTable({ memberships }: MembershipTableProps) {
  if (memberships.length === 0) {
    return <AdminEmptyState message="멤버십이 없습니다." />;
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      <table className="min-w-full divide-y divide-gray-200 text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left font-medium text-gray-500">이름</th>
            <th className="px-4 py-3 text-left font-medium text-gray-500">이메일</th>
            <th className="px-4 py-3 text-left font-medium text-gray-500">역할</th>
            <th className="px-4 py-3 text-left font-medium text-gray-500">상태</th>
            <th className="px-4 py-3 text-left font-medium text-gray-500 hidden md:table-cell">가입일</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 bg-white">
          {memberships.map((m) => (
            <tr key={m.id} className="hover:bg-gray-50">
              <td className="px-4 py-3 font-medium text-gray-900">{m.userName}</td>
              <td className="px-4 py-3 text-gray-500 max-w-[200px] truncate">{m.userEmail}</td>
              <td className="px-4 py-3">
                <StatusBadge value={m.role} />
              </td>
              <td className="px-4 py-3">
                <StatusBadge value={m.status} />
              </td>
              <td className="px-4 py-3 text-gray-400 text-xs hidden md:table-cell">
                {m.joinedAt ? m.joinedAt.toLocaleDateString("ko-KR") : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
