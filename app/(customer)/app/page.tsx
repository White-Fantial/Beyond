import { requirePermission } from "@/lib/auth/permissions";
import { PERMISSIONS } from "@/lib/auth/constants";

export default async function CustomerAppPage() {
  const ctx = await requirePermission(PERMISSIONS.CUSTOMER_APP);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">안녕하세요, {ctx.name}님 👋</h1>
      <p className="text-gray-500 mb-6">주문 현황과 구독 정보를 확인하세요.</p>
      <div className="grid grid-cols-2 gap-4">
        <a href="/app/orders" className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-sm transition">
          <div className="text-2xl mb-2">📦</div>
          <div className="font-medium text-gray-900">내 주문</div>
          <div className="text-sm text-gray-500">주문 현황 조회</div>
        </a>
        <a href="/app/subscriptions" className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-sm transition">
          <div className="text-2xl mb-2">🔄</div>
          <div className="font-medium text-gray-900">구독</div>
          <div className="text-sm text-gray-500">구독 관리</div>
        </a>
        <a href="/app/account" className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-sm transition">
          <div className="text-2xl mb-2">👤</div>
          <div className="font-medium text-gray-900">내 계정</div>
          <div className="text-sm text-gray-500">계정 설정</div>
        </a>
      </div>
    </div>
  );
}
