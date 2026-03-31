import Link from "next/link";
import { requirePlatformAdmin } from "@/lib/admin/auth-guard";
import { getAdminDashboardSummary } from "@/services/admin/admin-dashboard.service";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import AdminStatCard from "@/components/admin/AdminStatCard";
import StatusBadge from "@/components/admin/StatusBadge";

export default async function AdminHomePage() {
  await requirePlatformAdmin();
  const summary = await getAdminDashboardSummary();

  return (
    <div>
      <AdminPageHeader
        title="플랫폼 대시보드"
        description="플랫폼 전체 현황을 한눈에 확인합니다."
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <AdminStatCard label="전체 테넌트" value={summary.totalTenants} sub={`+${summary.newTenantsLast7Days} (7일)`} />
        <AdminStatCard label="전체 매장" value={summary.totalStores} sub={`+${summary.newStoresLast7Days} (7일)`} />
        <AdminStatCard label="전체 사용자" value={summary.totalUsers} sub={`+${summary.newUsersLast7Days} (7일)`} />
        <AdminStatCard label="전체 연결" value={summary.totalConnections} />
      </div>

      {/* Recent lists */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Tenants */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-700">최근 테넌트</h2>
            <Link href="/admin/tenants" className="text-xs text-blue-600 hover:underline">전체 보기 →</Link>
          </div>
          {summary.recentTenants.length === 0 ? (
            <p className="text-xs text-gray-400 py-4 text-center">데이터가 없습니다.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {summary.recentTenants.map((t) => (
                <li key={t.id} className="py-2 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <Link href={`/admin/tenants/${t.id}`} className="text-sm font-medium text-gray-900 hover:underline truncate block">
                      {t.displayName}
                    </Link>
                    <span className="text-xs text-gray-400">{t.slug}</span>
                  </div>
                  <StatusBadge value={t.status} />
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Recent Users */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-700">최근 사용자</h2>
            <Link href="/admin/users" className="text-xs text-blue-600 hover:underline">전체 보기 →</Link>
          </div>
          {summary.recentUsers.length === 0 ? (
            <p className="text-xs text-gray-400 py-4 text-center">데이터가 없습니다.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {summary.recentUsers.map((u) => (
                <li key={u.id} className="py-2 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <Link href={`/admin/users/${u.id}`} className="text-sm font-medium text-gray-900 hover:underline truncate block">
                      {u.name}
                    </Link>
                    <span className="text-xs text-gray-400 truncate block">{u.email}</span>
                  </div>
                  <StatusBadge value={u.platformRole} />
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Recent Stores */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-700">최근 매장</h2>
            <Link href="/admin/stores" className="text-xs text-blue-600 hover:underline">전체 보기 →</Link>
          </div>
          {summary.recentStores.length === 0 ? (
            <p className="text-xs text-gray-400 py-4 text-center">데이터가 없습니다.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {summary.recentStores.map((s) => (
                <li key={s.id} className="py-2 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <Link href={`/admin/stores/${s.id}`} className="text-sm font-medium text-gray-900 hover:underline truncate block">
                      {s.name}
                    </Link>
                    <span className="text-xs text-gray-400 truncate block">{s.tenantDisplayName}</span>
                  </div>
                  <StatusBadge value={s.status} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
