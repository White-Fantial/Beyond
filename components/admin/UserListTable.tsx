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
    return <AdminEmptyState message={emptyMessage ?? "No users found."} />;
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      <table className="min-w-full divide-y divide-gray-200 text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left font-medium text-gray-500">Name</th>
            <th className="px-4 py-3 text-left font-medium text-gray-500">Email</th>
            <th className="px-4 py-3 text-left font-medium text-gray-500 hidden sm:table-cell">Platform role</th>
            <th className="px-4 py-3 text-left font-medium text-gray-500">Status</th>
            <th className="px-4 py-3 text-right font-medium text-gray-500 hidden md:table-cell">Tenants</th>
            <th className="px-4 py-3 text-right font-medium text-gray-500 hidden md:table-cell">Stores</th>
            <th className="px-4 py-3 text-left font-medium text-gray-500 hidden lg:table-cell">Created</th>
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
                {u.createdAt.toLocaleDateString("en-US")}
              </td>
              <td className="px-4 py-3 text-right">
                <Link
                  href={`/admin/users/${u.id}`}
                  className="text-xs text-blue-600 hover:underline whitespace-nowrap"
                >
                  Details →
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
