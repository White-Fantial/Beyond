import type { StoreMembershipRow } from "@/types/admin";
import StatusBadge from "./StatusBadge";
import AdminEmptyState from "./AdminEmptyState";

interface StoreMembershipTableProps {
  memberships: StoreMembershipRow[];
}

export default function StoreMembershipTable({ memberships }: StoreMembershipTableProps) {
  if (memberships.length === 0) {
    return <AdminEmptyState message="No memberships found." />;
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      <table className="min-w-full divide-y divide-gray-200 text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left font-medium text-gray-500">Name</th>
            <th className="px-4 py-3 text-left font-medium text-gray-500">Email</th>
            <th className="px-4 py-3 text-left font-medium text-gray-500">Store role</th>
            <th className="px-4 py-3 text-left font-medium text-gray-500">Status</th>
            <th className="px-4 py-3 text-left font-medium text-gray-500 hidden md:table-cell">Created</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 bg-white">
          {memberships.map((sm) => (
            <tr key={sm.id} className="hover:bg-gray-50">
              <td className="px-4 py-3 font-medium text-gray-900">{sm.userName}</td>
              <td className="px-4 py-3 text-gray-500 max-w-[200px] truncate">{sm.userEmail}</td>
              <td className="px-4 py-3">
                <StatusBadge value={sm.role} />
              </td>
              <td className="px-4 py-3">
                <StatusBadge value={sm.status} />
              </td>
              <td className="px-4 py-3 text-gray-400 text-xs hidden md:table-cell">
                {sm.createdAt.toLocaleDateString("en-US")}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
