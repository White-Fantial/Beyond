import Link from "next/link";
import { requirePlatformAdmin } from "@/lib/admin/auth-guard";
import { getAdminUserDetail } from "@/services/admin/admin-user.service";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import AdminStatCard from "@/components/admin/AdminStatCard";
import AdminKeyValueList from "@/components/admin/AdminKeyValueList";
import AdminEmptyState from "@/components/admin/AdminEmptyState";
import StatusBadge from "@/components/admin/StatusBadge";

interface PageProps {
  params: Promise<{ userId: string }>;
}

export default async function AdminUserDetailPage({ params }: PageProps) {
  await requirePlatformAdmin();
  const { userId } = await params;
  const user = await getAdminUserDetail(userId);

  return (
    <div>
      <div className="mb-2">
        <Link href="/admin/users" className="text-xs text-gray-400 hover:underline">
          ← 사용자 목록
        </Link>
      </div>

      <AdminPageHeader title={user.name} description={user.email} />

      {/* Summary KPI */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <AdminStatCard label="소속 테넌트 수" value={user.tenantCount} />
        <AdminStatCard label="소속 매장 수" value={user.storeCount} />
      </div>

      {/* Basic Info */}
      <div className="bg-white rounded-lg border border-gray-200 p-5 mb-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">기본 정보</h2>
        <AdminKeyValueList
          items={[
            { label: "ID", value: <span className="font-mono text-xs">{user.id}</span> },
            { label: "이름", value: user.name },
            { label: "이메일", value: user.email },
            { label: "전화번호", value: user.phone ?? "—" },
            { label: "플랫폼 역할", value: <StatusBadge value={user.platformRole} /> },
            { label: "상태", value: <StatusBadge value={user.status} /> },
            { label: "마지막 로그인", value: user.lastLoginAt ? user.lastLoginAt.toLocaleString("ko-KR") : "—" },
            { label: "생성일", value: user.createdAt.toLocaleString("ko-KR") },
            { label: "수정일", value: user.updatedAt.toLocaleString("ko-KR") },
          ]}
        />
      </div>

      {/* Tenant Memberships */}
      <div className="bg-white rounded-lg border border-gray-200 p-5 mb-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">
          테넌트 멤버십 ({user.tenantCount})
        </h2>
        {user.tenantMemberships.length === 0 ? (
          <AdminEmptyState message="소속 테넌트가 없습니다." />
        ) : (
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">테넌트</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">역할</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">상태</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 hidden md:table-cell">가입일</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {user.tenantMemberships.map((m) => (
                  <tr key={m.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">
                      <Link href={`/admin/tenants/${m.tenantId}`} className="text-blue-600 hover:underline">
                        {m.tenantDisplayName}
                      </Link>
                    </td>
                    <td className="px-4 py-3"><StatusBadge value={m.role} /></td>
                    <td className="px-4 py-3"><StatusBadge value={m.status} /></td>
                    <td className="px-4 py-3 text-gray-400 text-xs hidden md:table-cell">
                      {m.joinedAt ? m.joinedAt.toLocaleDateString("ko-KR") : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Store Memberships */}
      <div className="bg-white rounded-lg border border-gray-200 p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">
          매장 멤버십 ({user.storeCount})
        </h2>
        {user.storeMemberships.length === 0 ? (
          <AdminEmptyState message="소속 매장이 없습니다." />
        ) : (
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">매장명</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 hidden sm:table-cell">테넌트</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">역할</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">상태</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 hidden md:table-cell">생성일</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {user.storeMemberships.map((sm) => (
                  <tr key={sm.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">
                      <Link href={`/admin/stores/${sm.storeId}`} className="text-blue-600 hover:underline">
                        {sm.storeName}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-gray-500 hidden sm:table-cell">
                      <Link href={`/admin/tenants/${sm.tenantId}`} className="text-blue-600 hover:underline">
                        {sm.tenantDisplayName}
                      </Link>
                    </td>
                    <td className="px-4 py-3"><StatusBadge value={sm.role} /></td>
                    <td className="px-4 py-3"><StatusBadge value={sm.status} /></td>
                    <td className="px-4 py-3 text-gray-400 text-xs hidden md:table-cell">
                      {sm.createdAt.toLocaleDateString("ko-KR")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
