import Link from "next/link";
import { requirePermission } from "@/lib/auth/permissions";
import { PERMISSIONS } from "@/lib/auth/constants";

export default async function CustomerAppPage() {
  const ctx = await requirePermission(PERMISSIONS.CUSTOMER_APP);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Welcome, {ctx.name} 👋</h1>
      <p className="text-gray-500 mb-6">View your orders and subscription details.</p>
      <div className="grid grid-cols-2 gap-4">
        <Link href="/app/orders" className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-sm transition">
          <div className="text-2xl mb-2">📦</div>
          <div className="font-medium text-gray-900">내 주문</div>
          <div className="text-sm text-gray-500">주문 현황 조회</div>
        </Link>
        <Link href="/app/subscriptions" className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-sm transition">
          <div className="text-2xl mb-2">🔄</div>
          <div className="font-medium text-gray-900">Subscription</div>
          <div className="text-sm text-gray-500">Subscription Management</div>
        </Link>
        <Link href="/app/account" className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-sm transition">
          <div className="text-2xl mb-2">👤</div>
          <div className="font-medium text-gray-900">My Account</div>
          <div className="text-sm text-gray-500">Account Settings</div>
        </Link>
        <Link href="/app/notifications" className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-sm transition">
          <div className="text-2xl mb-2">🔔</div>
          <div className="font-medium text-gray-900">Notifications</div>
          <div className="text-sm text-gray-500">View your alerts</div>
        </Link>
        <Link href="/app/addresses" className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-sm transition">
          <div className="text-2xl mb-2">📍</div>
          <div className="font-medium text-gray-900">Addresses</div>
          <div className="text-sm text-gray-500">Manage delivery addresses</div>
        </Link>
      </div>
    </div>
  );
}
