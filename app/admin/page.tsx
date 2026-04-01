import Link from "next/link";
import { requirePlatformAdmin } from "@/lib/admin/auth-guard";
import { getAdminDashboardSummary } from "@/services/admin/admin-dashboard.service";
import { summarizeAttentionCounts } from "@/services/admin/admin-attention.service";
import { getAdminTopProblemStores } from "@/services/admin/admin-analytics.service";
import { prisma } from "@/lib/prisma";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import AdminStatCard from "@/components/admin/AdminStatCard";
import StatusBadge from "@/components/admin/StatusBadge";
import AdminAttentionSummaryCards from "@/components/admin/analytics/AdminAttentionSummaryCards";

const DEFAULT_FILTERS = {
  from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
  to: new Date(),
};

export default async function AdminHomePage() {
  await requirePlatformAdmin();

  const [summary, attentionCounts, problemStores, reauthConnections, failedJobs] =
    await Promise.all([
      getAdminDashboardSummary(),
      summarizeAttentionCounts(DEFAULT_FILTERS),
      getAdminTopProblemStores(DEFAULT_FILTERS, 5),
      prisma.connection.findMany({
        where: { status: "REAUTH_REQUIRED" },
        orderBy: { reauthRequiredAt: "desc" },
        take: 5,
        select: {
          id: true,
          provider: true,
          store: { select: { name: true } },
          tenant: { select: { displayName: true } },
          reauthRequiredAt: true,
        },
      }),
      prisma.jobRun.findMany({
        where: {
          status: "FAILED",
          createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: { id: true, jobType: true, tenantId: true, storeId: true, createdAt: true, errorCode: true },
      }),
    ]);

  return (
    <div>
      <AdminPageHeader
        title="플랫폼 대시보드"
        description="플랫폼 전체 현황을 한눈에 확인합니다."
      />

      {/* CTA Links */}
      <div className="flex flex-wrap gap-2 mb-6">
        <Link href="/admin/analytics" className="inline-flex items-center px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700">
          📊 Analytics 열기
        </Link>
        <Link href="/admin/integrations" className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-gray-700 text-sm rounded hover:bg-gray-50">
          🔌 연동 관리
        </Link>
        <Link href="/admin/jobs" className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-gray-700 text-sm rounded hover:bg-gray-50">
          ⚙️ 작업 관리
        </Link>
        <Link href="/admin/logs" className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-gray-700 text-sm rounded hover:bg-gray-50">
          📋 로그
        </Link>
      </div>

      {/* Attention Summary */}
      <AdminAttentionSummaryCards
        summary={{
          ...attentionCounts,
          items: [],
        }}
      />

      {/* Ops KPI strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-3 mb-6">
        <div className={`rounded-lg border p-4 ${attentionCounts.critical > 0 ? "bg-red-50 border-red-200" : "bg-white border-gray-200"}`}>
          <div className="text-xs text-gray-500 mb-1">긴급 주의 사항</div>
          <div className={`text-2xl font-bold ${attentionCounts.critical > 0 ? "text-red-700" : "text-gray-800"}`}>{attentionCounts.critical}</div>
        </div>
        <div className={`rounded-lg border p-4 ${attentionCounts.warning > 0 ? "bg-yellow-50 border-yellow-200" : "bg-white border-gray-200"}`}>
          <div className="text-xs text-gray-500 mb-1">경고 사항</div>
          <div className={`text-2xl font-bold ${attentionCounts.warning > 0 ? "text-yellow-700" : "text-gray-800"}`}>{attentionCounts.warning}</div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-xs text-gray-500 mb-1">재인증 필요 연결</div>
          <div className={`text-2xl font-bold ${reauthConnections.length > 0 ? "text-orange-600" : "text-gray-800"}`}>{reauthConnections.length}</div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <AdminStatCard label="전체 테넌트" value={summary.totalTenants} sub={`+${summary.newTenantsLast7Days} (7일)`} />
        <AdminStatCard label="전체 매장" value={summary.totalStores} sub={`+${summary.newStoresLast7Days} (7일)`} />
        <AdminStatCard label="전체 사용자" value={summary.totalUsers} sub={`+${summary.newUsersLast7Days} (7일)`} />
        <AdminStatCard label="전체 연결" value={summary.totalConnections} />
      </div>

      {/* Ops Widgets Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Reauth Required */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-700">재인증 필요 연결</h2>
            <Link href="/admin/integrations?status=REAUTH_REQUIRED" className="text-xs text-blue-600 hover:underline">전체 보기 →</Link>
          </div>
          {reauthConnections.length === 0 ? (
            <p className="text-xs text-gray-400 py-4 text-center">재인증 필요 연결이 없습니다.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {reauthConnections.map((c) => (
                <li key={c.id} className="py-2 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <Link href={`/admin/integrations/${c.id}`} className="text-sm font-medium text-gray-900 hover:underline truncate block">
                      {c.store.name} — {c.provider as string}
                    </Link>
                    <span className="text-xs text-gray-400">{c.tenant.displayName}</span>
                  </div>
                  <StatusBadge value="REAUTH_REQUIRED" />
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Failed Jobs */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-700">최근 실패 작업 (7일)</h2>
            <Link href="/admin/jobs?status=FAILED" className="text-xs text-blue-600 hover:underline">전체 보기 →</Link>
          </div>
          {failedJobs.length === 0 ? (
            <p className="text-xs text-gray-400 py-4 text-center">실패 작업이 없습니다.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {failedJobs.map((j) => (
                <li key={j.id} className="py-2 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <Link href={`/admin/jobs/${j.id}`} className="text-sm font-medium text-gray-900 hover:underline truncate block font-mono">
                      {j.jobType as string}
                    </Link>
                    <span className="text-xs text-gray-400">{j.createdAt.toLocaleString("ko-KR")}</span>
                  </div>
                  <StatusBadge value="FAILED" />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Top Problem Stores */}
      {problemStores.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-4 mb-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-700">문제 매장 (최근 7일 기준)</h2>
            <Link href="/admin/analytics" className="text-xs text-blue-600 hover:underline">Analytics에서 보기 →</Link>
          </div>
          <ul className="divide-y divide-gray-100">
            {problemStores.slice(0, 5).map((s) => (
              <li key={s.storeId} className="py-2 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <Link href={`/admin/stores/${s.storeId}`} className="text-sm font-medium text-gray-900 hover:underline truncate block">
                    {s.storeName}
                  </Link>
                  <span className="text-xs text-gray-400">{s.tenantDisplayName}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded ${s.problemScore >= 10 ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700"}`}>
                    점수 {s.problemScore}
                  </span>
                  <Link href={`/admin/integrations?storeId=${s.storeId}`} className="text-xs text-blue-600 hover:underline">연동</Link>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

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
