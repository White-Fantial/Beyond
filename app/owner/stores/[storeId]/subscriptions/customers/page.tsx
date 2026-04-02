import { requireOwnerStoreAccess } from "@/services/owner/owner-authz.service";
import { listOwnerSubscriptionCustomers } from "@/services/owner/owner-subscriptions.service";

interface Props {
  params: { storeId: string };
}

export default async function SubscriptionCustomersPage({ params }: Props) {
  const { storeId } = params;
  await requireOwnerStoreAccess(storeId);
  const customers = await listOwnerSubscriptionCustomers(storeId);

  return (
    <div className="max-w-4xl mx-auto px-4 pb-10 space-y-4">
      <h2 className="text-base font-semibold text-gray-800">구독 고객 목록</h2>

      {customers.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
          <p className="text-sm text-gray-400">구독 고객이 없습니다.</p>
          <p className="text-xs text-gray-400 mt-1">Customer 프로필 테이블 연동 후 상세 정보가 표시됩니다.</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">고객 ID</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">이름</th>
                  <th className="text-center px-4 py-2.5 text-xs font-medium text-gray-500">활성 구독</th>
                  <th className="text-center px-4 py-2.5 text-xs font-medium text-gray-500">일시정지</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">다음 주문일</th>
                  <th className="text-right px-4 py-2.5 text-xs font-medium text-gray-500">월 예상 금액</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {customers.map((c) => (
                  <tr key={c.customerId} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-400 text-xs font-mono">{c.customerId.slice(0, 8)}…</td>
                    <td className="px-4 py-3 text-gray-700">
                      {c.name ?? <span className="text-gray-300 italic">고객 정보 미연동</span>}
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
                        ? `₩${(c.totalMonthlyAmountMinorUnit / 100).toLocaleString()}`
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
