import Link from "next/link";
import AdminEmptyState from "@/components/admin/AdminEmptyState";
import type { AdminSubscriptionPlanRow } from "@/types/admin";

interface BillingSubscriptionTableProps {
  plans: AdminSubscriptionPlanRow[];
  emptyMessage?: string;
}

export default function BillingSubscriptionTable({
  plans,
  emptyMessage = "No subscription plans.",
}: BillingSubscriptionTableProps) {
  if (plans.length === 0) {
    return <AdminEmptyState message={emptyMessage} />;
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      <table className="min-w-full divide-y divide-gray-200 text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left font-medium text-gray-500">Plan name</th>
            <th className="px-4 py-3 text-left font-medium text-gray-500 hidden sm:table-cell">Store</th>
            <th className="px-4 py-3 text-left font-medium text-gray-500 hidden md:table-cell">Tenant</th>
            <th className="px-4 py-3 text-right font-medium text-gray-500">Price</th>
            <th className="px-4 py-3 text-left font-medium text-gray-500 hidden md:table-cell">Interval</th>
            <th className="px-4 py-3 text-right font-medium text-gray-500">Active subscriptions</th>
            <th className="px-4 py-3 text-left font-medium text-gray-500 hidden lg:table-cell">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 bg-white">
          {plans.map((p) => (
            <tr key={p.id} className="hover:bg-gray-50">
              <td className="px-4 py-3 font-medium text-gray-900">{p.name}</td>
              <td className="px-4 py-3 text-gray-500 hidden sm:table-cell">
                <Link href={`/admin/stores/${p.storeId}`} className="text-blue-600 hover:underline">
                  {p.storeName}
                </Link>
              </td>
              <td className="px-4 py-3 text-gray-500 hidden md:table-cell">{p.tenantDisplayName}</td>
              <td className="px-4 py-3 text-right text-gray-700 font-medium">
                {p.price.toLocaleString("en-US")}
              </td>
              <td className="px-4 py-3 text-gray-500 hidden md:table-cell font-mono text-xs">
                {p.interval}
              </td>
              <td className="px-4 py-3 text-right text-gray-700 font-medium">
                {p.activeSubscriptions}
              </td>
              <td className="px-4 py-3 hidden lg:table-cell">
                {p.isActive ? (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-50 text-green-700 border border-green-200">
                    Active
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-500 border border-gray-200">
                    Inactive
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
