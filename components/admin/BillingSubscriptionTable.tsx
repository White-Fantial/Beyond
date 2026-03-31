import Link from "next/link";
import AdminEmptyState from "@/components/admin/AdminEmptyState";
import type { AdminSubscriptionPlanRow } from "@/types/admin";

interface BillingSubscriptionTableProps {
  plans: AdminSubscriptionPlanRow[];
  emptyMessage?: string;
}

export default function BillingSubscriptionTable({
  plans,
  emptyMessage = "구독 플랜이 없습니다.",
}: BillingSubscriptionTableProps) {
  if (plans.length === 0) {
    return <AdminEmptyState message={emptyMessage} />;
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      <table className="min-w-full divide-y divide-gray-200 text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left font-medium text-gray-500">플랜명</th>
            <th className="px-4 py-3 text-left font-medium text-gray-500 hidden sm:table-cell">매장</th>
            <th className="px-4 py-3 text-left font-medium text-gray-500 hidden md:table-cell">테넌트</th>
            <th className="px-4 py-3 text-right font-medium text-gray-500">가격</th>
            <th className="px-4 py-3 text-left font-medium text-gray-500 hidden md:table-cell">주기</th>
            <th className="px-4 py-3 text-right font-medium text-gray-500">활성 구독</th>
            <th className="px-4 py-3 text-left font-medium text-gray-500 hidden lg:table-cell">상태</th>
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
                {p.price.toLocaleString("ko-KR")}원
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
                    활성
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-500 border border-gray-200">
                    비활성
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
