import { requireOwnerStoreAccess } from "@/services/owner/owner-authz.service";
import { listOwnerUpcomingSubscriptions } from "@/services/owner/owner-subscriptions.service";

interface Props {
  params: Promise<{ storeId: string }>;
}

export default async function UpcomingSubscriptionsPage({ params }: Props) {
  const { storeId } = await params;
  await requireOwnerStoreAccess(storeId);
  const upcoming = await listOwnerUpcomingSubscriptions(storeId, 30);

  return (
    <div className="max-w-4xl mx-auto px-4 pb-10 space-y-4">
      <div>
        <h2 className="text-base font-semibold text-gray-800">Upcoming Subscription Orders (30 days)</h2>
        <p className="text-xs text-gray-500 mt-0.5">
          향후 30일 내 예정된 구독 주문입니다.
        </p>
      </div>

      {upcoming.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
          <p className="text-sm text-gray-400">No upcoming subscription orders.</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">Scheduled</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">Plan Name</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">Customer</th>
                  <th className="text-right px-4 py-2.5 text-xs font-medium text-gray-500">예상 Amount</th>
                  <th className="text-center px-4 py-2.5 text-xs font-medium text-gray-500">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {upcoming.map((row) => (
                  <tr key={row.subscriptionId} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-700">
                      {new Date(row.nextBillingDate).toLocaleDateString("ko-KR")}
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900">{row.planName}</td>
                    <td className="px-4 py-3 text-gray-500">
                      {row.customerName ?? (
                        <span className="text-gray-300 italic text-xs">ID: {row.customerId.slice(0, 8)}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700">
                      {row.expectedAmountMinorUnit > 0
                        ? `₩${(row.expectedAmountMinorUnit / 100).toLocaleString()}`
                        : "-"}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                        {row.status}
                      </span>
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
