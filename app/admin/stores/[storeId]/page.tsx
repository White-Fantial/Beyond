import Link from "next/link";
import { requirePlatformAdmin } from "@/lib/admin/auth-guard";
import { getAdminStoreDetail } from "@/services/admin/admin-store.service";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import AdminStatCard from "@/components/admin/AdminStatCard";
import AdminKeyValueList from "@/components/admin/AdminKeyValueList";
import StatusBadge from "@/components/admin/StatusBadge";
import StoreMembershipTable from "@/components/admin/StoreMembershipTable";
import StoreConnectionTable from "@/components/admin/StoreConnectionTable";

interface PageProps {
  params: Promise<{ storeId: string }>;
}

export default async function AdminStoreDetailPage({ params }: PageProps) {
  await requirePlatformAdmin();
  const { storeId } = await params;
  const store = await getAdminStoreDetail(storeId);

  return (
    <div>
      <div className="mb-2">
        <Link href="/admin/stores" className="text-xs text-gray-400 hover:underline">
          ← 매장 목록
        </Link>
      </div>

      <AdminPageHeader title={store.name} description={`코드: ${store.code}`} />

      {/* Summary KPI */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <AdminStatCard label="멤버십 수" value={store.membershipCount} />
        <AdminStatCard label="연결 수" value={store.connectionCount} />
        <AdminStatCard label="활성 연결" value={store.activeConnectionCount} />
      </div>

      {/* Basic Info */}
      <div className="bg-white rounded-lg border border-gray-200 p-5 mb-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">기본 정보</h2>
        <AdminKeyValueList
          items={[
            { label: "ID", value: <span className="font-mono text-xs">{store.id}</span> },
            {
              label: "테넌트",
              value: (
                <Link href={`/admin/tenants/${store.tenantId}`} className="text-blue-600 hover:underline">
                  {store.tenantDisplayName}
                </Link>
              ),
            },
            { label: "매장명", value: store.name },
            { label: "표시명", value: store.displayName },
            { label: "코드", value: <span className="font-mono text-xs">{store.code}</span> },
            { label: "상태", value: <StatusBadge value={store.status} /> },
            { label: "시간대", value: store.timezone },
            { label: "통화", value: store.currency },
            { label: "국가 코드", value: store.countryCode },
            { label: "생성일", value: store.createdAt.toLocaleString("ko-KR") },
            { label: "수정일", value: store.updatedAt.toLocaleString("ko-KR") },
          ]}
        />
      </div>

      {/* Store Memberships */}
      <div className="bg-white rounded-lg border border-gray-200 p-5 mb-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">
          매장 멤버십 ({store.membershipCount})
        </h2>
        <StoreMembershipTable memberships={store.memberships} />
      </div>

      {/* Connections */}
      <div className="bg-white rounded-lg border border-gray-200 p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">
          연결 ({store.connectionCount})
        </h2>
        <StoreConnectionTable connections={store.connections} />
      </div>
    </div>
  );
}
