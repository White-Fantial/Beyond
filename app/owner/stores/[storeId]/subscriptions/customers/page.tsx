import { requireOwnerStoreAccess } from "@/services/owner/owner-authz.service";
import { listOwnerSubscriptionCustomers } from "@/services/owner/owner-subscriptions.service";

interface Props {
  params: Promise<{ storeId: string }>;
}

export default async function SubscriptionCustomersPage({ params }: Props) {
  const { storeId } = await params;
  await requireOwnerStoreAccess(storeId);
  const customers = await listOwnerSubscriptionCustomers(storeId);

  return (
    <div className="max-w-4xl mx-auto px-4 pb-10 space-y-4">
      <h2 className="text-base font-semibold text-gray-800">Subscription Customers</h2>

      {customers.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
          <p className="text-sm text-gray-400">No subscription customers.</p>
          <p className="text-xs text-gray-400 mt-1">Customer details will be displayed after profile table integration.</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">Customer ID</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">Name</th>
                  <th className="text-center px-4 py-2.5 text-xs font-medium text-gray-500">Active Subscriptions</th>
                  <th className="text-center px-4 py-2.5 text-xs font-medium text-gray-500">Paused</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">Next Order</th>
                  <th className="text-right px-4 py-2.5 text-xs font-medium text-gray-500">월 예상 Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {customers.map((c) => (
                  <tr key={c.customerId} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-400 text-xs font-mono">{c.customerId.slice(0, 8)}…</td>
                    <td className="px-4 py-3 text-gray-700">
                      {c.name ?? <span className="text-gray-300 italic">고객 Info 미연동</span>}
                    </td>
                    <td className="px-4 py-3 text-center font-medium text-green-700">{c.activeSubscriptionCount}</td>
                    <td className="px-4 py-3 text-center text-gray-500">{c.pausedSubscriptionCount}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {c.nextOrderDate
                        ? new Date(c.nextOrderDate).toLocaleDateString("ko-KR")
                        : "-"}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700">
                      {c.totalMonthlyAmountMinorUnit > 0
                        ? `$${(c.totalMonthlyAmountMinorUnit / 100).toLocaleString("en-US")}`
                        : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
