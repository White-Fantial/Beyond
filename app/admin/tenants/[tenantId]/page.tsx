import Link from "next/link";
import { requirePlatformAdmin } from "@/lib/admin/auth-guard";
import { getAdminTenantDetail } from "@/services/admin/admin-tenant.service";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import AdminStatCard from "@/components/admin/AdminStatCard";
import AdminKeyValueList from "@/components/admin/AdminKeyValueList";
import StatusBadge from "@/components/admin/StatusBadge";
import AdminStatusChangeForm from "@/components/admin/AdminStatusChangeForm";
import ConnectionSummaryTable from "@/components/admin/ConnectionSummaryTable";
import TenantDetailActions from "@/components/admin/TenantDetailActions";
import MembershipEditButton from "@/components/admin/MembershipEditButton";

const TENANT_STATUS_OPTIONS = [
  { value: "ACTIVE", label: "활성" },
  { value: "TRIAL", label: "체험" },
  { value: "SUSPENDED", label: "정지" },
  { value: "ARCHIVED", label: "보관" },
];

interface PageProps {
  params: Promise<{ tenantId: string }>;
}

export default async function AdminTenantDetailPage({ params }: PageProps) {
  await requirePlatformAdmin();
  const { tenantId } = await params;
  const tenant = await getAdminTenantDetail(tenantId);

  return (
    <div>
      <div className="mb-2">
        <Link href="/admin/tenants" className="text-xs text-gray-400 hover:underline">
          ← 테넌트 목록
        </Link>
      </div>

      <div className="flex items-start justify-between gap-4 mb-6">
        <AdminPageHeader title={tenant.displayName} description={`슬러그: ${tenant.slug}`} />
        <div className="shrink-0 pt-1">
          <TenantDetailActions
            tenant={{
              id: tenant.id,
              legalName: tenant.legalName,
              displayName: tenant.displayName,
              timezone: tenant.timezone,
              currency: tenant.currency,
              countryCode: tenant.countryCode,
              status: tenant.status,
            }}
          />
        </div>
      </div>

      {/* Summary KPI */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <AdminStatCard label="매장 수" value={tenant.storeCount} />
        <AdminStatCard label="멤버십 수" value={tenant.membershipCount} />
        <AdminStatCard label="사용자 수" value={tenant.userCount} />
        <AdminStatCard label="연결 수" value={tenant.connectionCount} />
      </div>

      {/* Basic Info */}
      <div className="bg-white rounded-lg border border-gray-200 p-5 mb-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">기본 정보</h2>
        <AdminKeyValueList
          items={[
            { label: "ID", value: <span className="font-mono text-xs">{tenant.id}</span> },
            { label: "법인명", value: tenant.legalName },
            { label: "표시명", value: tenant.displayName },
            { label: "슬러그", value: <span className="font-mono text-xs">{tenant.slug}</span> },
            { label: "상태", value: <StatusBadge value={tenant.status} /> },
            { label: "시간대", value: tenant.timezone },
            { label: "통화", value: tenant.currency },
            { label: "국가 코드", value: tenant.countryCode },
            { label: "생성일", value: tenant.createdAt.toLocaleString("ko-KR") },
            { label: "수정일", value: tenant.updatedAt.toLocaleString("ko-KR") },
          ]}
        />
      </div>

      {/* Status Change */}
      <div className="bg-white rounded-lg border border-gray-200 p-5 mb-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">상태 변경</h2>
        <AdminStatusChangeForm
          entityType="tenants"
          entityId={tenant.id}
          currentStatus={tenant.status}
          options={TENANT_STATUS_OPTIONS}
        />
      </div>

      {/* Stores */}
      <div className="bg-white rounded-lg border border-gray-200 p-5 mb-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">소속 매장 ({tenant.storeCount})</h2>
        {tenant.stores.length === 0 ? (
          <p className="text-sm text-gray-400">매장이 없습니다.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">매장명</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">코드</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">상태</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 hidden md:table-cell">시간대</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 hidden lg:table-cell">생성일</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {tenant.stores.map((s) => (
                  <tr key={s.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{s.name}</td>
                    <td className="px-4 py-3 text-gray-500 font-mono text-xs">{s.code}</td>
                    <td className="px-4 py-3"><StatusBadge value={s.status} /></td>
                    <td className="px-4 py-3 text-gray-500 hidden md:table-cell">{s.timezone}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs hidden lg:table-cell">
                      {s.createdAt.toLocaleDateString("ko-KR")}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/admin/stores/${s.id}`} className="text-xs text-blue-600 hover:underline whitespace-nowrap">
                        상세 →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Memberships */}
      <div className="bg-white rounded-lg border border-gray-200 p-5 mb-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">멤버십 ({tenant.membershipCount})</h2>
        {tenant.memberships.length === 0 ? (
          <p className="text-sm text-gray-400">멤버십이 없습니다.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">사용자</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">역할</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">상태</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 hidden md:table-cell">가입일</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {tenant.memberships.map((m) => (
                  <tr key={m.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <Link href={`/admin/users/${m.userId}`} className="text-blue-600 hover:underline">
                        {m.userName}
                      </Link>
                      <div className="text-xs text-gray-400">{m.userEmail}</div>
                    </td>
                    <td className="px-4 py-3"><StatusBadge value={m.role} /></td>
                    <td className="px-4 py-3"><StatusBadge value={m.status} /></td>
                    <td className="px-4 py-3 text-gray-400 text-xs hidden md:table-cell">
                      {m.joinedAt ? m.joinedAt.toLocaleDateString("ko-KR") : "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <MembershipEditButton
                        membershipId={m.id}
                        currentRole={m.role}
                        currentStatus={m.status}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Connection Summary */}
      <div className="bg-white rounded-lg border border-gray-200 p-5 mb-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">연결 요약</h2>
        <ConnectionSummaryTable rows={tenant.connectionSummary} />
      </div>

      {/* Log Links */}
      <div className="bg-white rounded-lg border border-gray-200 p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">로그</h2>
        <div className="flex flex-wrap gap-3 text-sm">
          <Link
            href={`/admin/logs?tenantId=${tenantId}`}
            className="text-blue-600 hover:underline"
          >
            📋 이 테넌트의 전체 로그 →
          </Link>
          <Link
            href={`/admin/logs?tenantId=${tenantId}&logType=AUDIT`}
            className="text-blue-600 hover:underline"
          >
            Audit 로그 →
          </Link>
          <Link
            href={`/admin/logs?tenantId=${tenantId}&logType=CONNECTION_ACTION`}
            className="text-blue-600 hover:underline"
          >
            Connection 로그 →
          </Link>
          <Link
            href={`/admin/logs?tenantId=${tenantId}&logType=WEBHOOK`}
            className="text-blue-600 hover:underline"
          >
            Webhook 로그 →
          </Link>
        </div>
      </div>
    </div>
  );
}
