import Link from "next/link";
import type { AdminStoreListItem } from "@/types/admin";
import StatusBadge from "./StatusBadge";
import AdminEmptyState from "./AdminEmptyState";

interface StoreListTableProps {
  items: AdminStoreListItem[];
  emptyMessage?: string;
}

export default function StoreListTable({ items, emptyMessage }: StoreListTableProps) {
  if (items.length === 0) {
    return <AdminEmptyState message={emptyMessage ?? "No stores found."} />;
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      <table className="min-w-full divide-y divide-gray-200 text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left font-medium text-gray-500">Store name</th>
            <th className="px-4 py-3 text-left font-medium text-gray-500 hidden sm:table-cell">Code</th>
            <th className="px-4 py-3 text-left font-medium text-gray-500">Tenant</th>
            <th className="px-4 py-3 text-left font-medium text-gray-500">Status</th>
            <th className="px-4 py-3 text-left font-medium text-gray-500 hidden md:table-cell">Timezone</th>
            <th className="px-4 py-3 text-right font-medium text-gray-500 hidden md:table-cell">Connections</th>
            <th className="px-4 py-3 text-left font-medium text-gray-500 hidden lg:table-cell">Created</th>
            <th className="px-4 py-3"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 bg-white">
          {items.map((s) => (
            <tr key={s.id} className="hover:bg-gray-50">
              <td className="px-4 py-3 font-medium text-gray-900 max-w-[160px] truncate">
                <Link href={`/admin/stores/${s.id}`} className="text-blue-600 hover:underline">
                  {s.name}
                </Link>
              </td>
              <td className="px-4 py-3 text-gray-500 font-mono text-xs hidden sm:table-cell">{s.code}</td>
              <td className="px-4 py-3 text-gray-500 max-w-[140px] truncate">
                <Link
                  href={`/admin/tenants/${s.tenantId}`}
                  className="hover:underline text-blue-600"
                >
                  {s.tenantDisplayName}
                </Link>
              </td>
              <td className="px-4 py-3">
                <StatusBadge value={s.status} />
              </td>
              <td className="px-4 py-3 text-gray-500 hidden md:table-cell">{s.timezone}</td>
              <td className="px-4 py-3 text-right text-gray-700 hidden md:table-cell">{s.connectionCount}</td>
              <td className="px-4 py-3 text-gray-400 text-xs hidden lg:table-cell">
                {s.createdAt.toLocaleDateString("en-US")}
              </td>
              <td className="px-4 py-3 text-right">
                <Link
                  href={`/admin/stores/${s.id}`}
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
