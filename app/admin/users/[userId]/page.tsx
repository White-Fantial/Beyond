import Link from "next/link";
import { requirePlatformAdmin } from "@/lib/admin/auth-guard";
import { getAdminUserDetail } from "@/services/admin/admin-user.service";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import AdminStatCard from "@/components/admin/AdminStatCard";
import AdminKeyValueList from "@/components/admin/AdminKeyValueList";
import AdminEmptyState from "@/components/admin/AdminEmptyState";
import StatusBadge from "@/components/admin/StatusBadge";
import AdminStatusChangeForm from "@/components/admin/AdminStatusChangeForm";
import ImpersonateButton from "@/components/admin/ImpersonateButton";
import UserDetailActions from "@/components/admin/UserDetailActions";
import MembershipEditButton from "@/components/admin/MembershipEditButton";

const USER_STATUS_OPTIONS = [
  { value: "ACTIVE", label: "활성" },
  { value: "INVITED", label: "초대됨" },
  { value: "SUSPENDED", label: "정지" },
  { value: "ARCHIVED", label: "보관" },
];

interface PageProps {
  params: Promise<{ userId: string }>;
}

export default async function AdminUserDetailPage({ params }: PageProps) {
  await requirePlatformAdmin();
  const { userId } = await params;
  const user = await getAdminUserDetail(userId);

  // Impersonation is allowed for non-admin active users
  const canImpersonate =
    user.platformRole !== "PLATFORM_ADMIN" &&
    user.status === "ACTIVE";

  return (
    <div>
      <div className="mb-2">
        <Link href="/admin/users" className="text-xs text-gray-400 hover:underline">
          ← 사용자 목록
        </Link>
      </div>

      <div className="flex items-start justify-between gap-4">
        <AdminPageHeader title={user.name} description={user.email} />
        <div className="shrink-0 pt-1 flex flex-col items-end gap-2">
          {canImpersonate ? (
            <ImpersonateButton
              targetUserId={user.id}
              targetName={user.name}
              targetEmail={user.email}
            />
          ) : (
            <div>
              <span className="inline-block px-3 py-1.5 text-sm text-gray-400 bg-gray-100 border border-gray-200 rounded-md cursor-not-allowed">
                👁 View as user
              </span>
              <p className="mt-1 text-xs text-gray-400">
                {user.platformRole === "PLATFORM_ADMIN"
                  ? "Cannot impersonate another admin"
                  : "User must be active"}
              </p>
            </div>
          )}
          <UserDetailActions
            user={{
              id: user.id,
              name: user.name,
              email: user.email,
              phone: user.phone,
              platformRole: user.platformRole,
            }}
          />
        </div>
      </div>

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

      {/* Status Change */}
      <div className="bg-white rounded-lg border border-gray-200 p-5 mb-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">상태 변경</h2>
        <AdminStatusChangeForm
          entityType="users"
          entityId={user.id}
          currentStatus={user.status}
          options={USER_STATUS_OPTIONS}
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
                  <th className="px-4 py-3"></th>
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
