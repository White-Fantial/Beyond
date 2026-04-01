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
    return <AdminEmptyState message={emptyMessage ?? "No tenants found."} />;
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      <table className="min-w-full divide-y divide-gray-200 text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left font-medium text-gray-500">Name</th>
            <th className="px-4 py-3 text-left font-medium text-gray-500">Slug</th>
            <th className="px-4 py-3 text-left font-medium text-gray-500">Status</th>
            <th className="px-4 py-3 text-left font-medium text-gray-500 hidden md:table-cell">Timezone</th>
            <th className="px-4 py-3 text-left font-medium text-gray-500 hidden md:table-cell">Currency</th>
            <th className="px-4 py-3 text-right font-medium text-gray-500 hidden sm:table-cell">Stores</th>
            <th className="px-4 py-3 text-right font-medium text-gray-500 hidden sm:table-cell">Members</th>
            <th className="px-4 py-3 text-left font-medium text-gray-500 hidden lg:table-cell">Created</th>
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
                {t.createdAt.toLocaleDateString("en-US")}
              </td>
              <td className="px-4 py-3 text-right">
                <Link
                  href={`/admin/tenants/${t.id}`}
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
