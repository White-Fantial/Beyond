import Link from "next/link";
import { requirePlatformAdmin } from "@/lib/admin/auth-guard";
import { getAdminConnectionDetail } from "@/services/admin/admin-integration.service";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import AdminKeyValueList from "@/components/admin/AdminKeyValueList";
import StatusBadge from "@/components/admin/StatusBadge";
import ConnectionCredentialTable from "@/components/admin/ConnectionCredentialTable";
import ConnectionActionLogTable from "@/components/admin/ConnectionActionLogTable";
import ConnectionStatusChangeForm from "@/components/admin/ConnectionStatusChangeForm";
import RotateCredentialButton from "@/components/admin/RotateCredentialButton";

interface PageProps {
  params: Promise<{ connectionId: string }>;
}

export default async function AdminConnectionDetailPage({ params }: PageProps) {
  await requirePlatformAdmin();
  const { connectionId } = await params;
  const conn = await getAdminConnectionDetail(connectionId);

  return (
    <div>
      <div className="mb-2">
        <Link href="/admin/integrations" className="text-xs text-gray-400 hover:underline">
          ← 연동 목록
        </Link>
      </div>

      <AdminPageHeader
        title={`${conn.provider} — ${conn.storeName}`}
        description={conn.displayName ?? conn.externalStoreName ?? conn.id}
      />

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-xs text-gray-400 mb-1">상태</div>
          <StatusBadge value={conn.status} />
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-xs text-gray-400 mb-1">유형</div>
          <span className="font-mono text-xs text-gray-700">{conn.type}</span>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-xs text-gray-400 mb-1">활성 자격 증명</div>
          <span className="text-sm font-semibold text-gray-900">
            {conn.credentials.filter((c) => c.isActive).length}
          </span>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-xs text-gray-400 mb-1">최근 작업 로그</div>
          <span className="text-sm font-semibold text-gray-900">{conn.recentActionLogs.length}</span>
        </div>
      </div>

      {/* Basic Info */}
      <div className="bg-white rounded-lg border border-gray-200 p-5 mb-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">기본 정보</h2>
        <AdminKeyValueList
          items={[
            { label: "ID", value: <span className="font-mono text-xs">{conn.id}</span> },
            {
              label: "테넌트",
              value: (
                <Link href={`/admin/tenants/${conn.tenantId}`} className="text-blue-600 hover:underline">
                  {conn.tenantDisplayName}
                </Link>
              ),
            },
            {
              label: "매장",
              value: (
                <Link href={`/admin/stores/${conn.storeId}`} className="text-blue-600 hover:underline">
                  {conn.storeName}
                </Link>
              ),
            },
            { label: "공급자", value: <span className="font-mono text-xs">{conn.provider}</span> },
            { label: "유형", value: <span className="font-mono text-xs">{conn.type}</span> },
            { label: "상태", value: <StatusBadge value={conn.status} /> },
            ...(conn.authScheme
              ? [{ label: "인증 방식", value: <span className="font-mono text-xs">{conn.authScheme}</span> }]
              : []),
            ...(conn.externalMerchantId
              ? [{ label: "외부 가맹점 ID", value: <span className="font-mono text-xs">{conn.externalMerchantId}</span> }]
              : []),
            ...(conn.externalStoreId
              ? [{ label: "외부 매장 ID", value: <span className="font-mono text-xs">{conn.externalStoreId}</span> }]
              : []),
            ...(conn.externalStoreName
              ? [{ label: "외부 매장명", value: conn.externalStoreName }]
              : []),
            ...(conn.externalLocationId
              ? [{ label: "외부 위치 ID", value: <span className="font-mono text-xs">{conn.externalLocationId}</span> }]
              : []),
            {
              label: "마지막 연결",
              value: conn.lastConnectedAt ? conn.lastConnectedAt.toLocaleString("ko-KR") : "—",
            },
            {
              label: "마지막 인증 확인",
              value: conn.lastAuthValidatedAt ? conn.lastAuthValidatedAt.toLocaleString("ko-KR") : "—",
            },
            {
              label: "마지막 동기화",
              value: conn.lastSyncAt ? conn.lastSyncAt.toLocaleString("ko-KR") : "—",
            },
            ...(conn.lastSyncStatus
              ? [{ label: "동기화 상태", value: <StatusBadge value={conn.lastSyncStatus} /> }]
              : []),
            ...(conn.lastErrorCode
              ? [
                  { label: "마지막 오류 코드", value: <span className="font-mono text-xs text-red-600">{conn.lastErrorCode}</span> },
                  { label: "마지막 오류 메시지", value: <span className="text-xs text-red-600">{conn.lastErrorMessage}</span> },
                ]
              : []),
            ...(conn.reauthRequiredAt
              ? [
                  {
                    label: "재인증 요청일",
                    value: <span className="text-amber-600">{conn.reauthRequiredAt.toLocaleString("ko-KR")}</span>,
                  },
                ]
              : []),
            ...(conn.disconnectedAt
              ? [{ label: "연결 해제일", value: conn.disconnectedAt.toLocaleString("ko-KR") }]
              : []),
            { label: "생성일", value: conn.createdAt.toLocaleString("ko-KR") },
            { label: "수정일", value: conn.updatedAt.toLocaleString("ko-KR") },
          ]}
        />
      </div>

      {/* Status Change */}
      <div className="bg-white rounded-lg border border-gray-200 p-5 mb-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">연결 상태 변경</h2>
        <p className="text-xs text-gray-500 mb-3">
          관리자가 직접 연결 상태를 강제로 변경합니다. 모든 변경은 감사 로그에 기록됩니다.
        </p>
        <ConnectionStatusChangeForm
          connectionId={conn.id}
          currentStatus={conn.status}
        />
      </div>

      {/* Credential Rotation */}
      <div className="bg-white rounded-lg border border-gray-200 p-5 mb-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-1">자격 증명 교체</h2>
        <p className="text-xs text-gray-500 mb-3">
          현재 활성 자격 증명을 비활성화하고 연결 상태를 REAUTH_REQUIRED로 변경합니다.
          테넌트는 재인증해야 합니다. 이 작업은 되돌릴 수 없습니다.
        </p>
        <RotateCredentialButton connectionId={conn.id} />
      </div>

      {/* Credentials */}
      <div className="bg-white rounded-lg border border-gray-200 p-5 mb-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">
          자격 증명 ({conn.credentials.length})
        </h2>
        <ConnectionCredentialTable credentials={conn.credentials} />
      </div>

      {/* Recent Action Logs */}
      <div className="bg-white rounded-lg border border-gray-200 p-5 mb-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">
          최근 작업 로그 (최대 30건)
        </h2>
        <ConnectionActionLogTable items={conn.recentActionLogs} />
      </div>

      {/* Log Links */}
      <div className="bg-white rounded-lg border border-gray-200 p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">전체 로그</h2>
        <div className="flex flex-wrap gap-3 text-sm">
          <Link
            href={`/admin/logs?storeId=${conn.storeId}&logType=CONNECTION_ACTION`}
            className="text-blue-600 hover:underline"
          >
            📋 이 매장의 전체 Connection 로그 →
          </Link>
          <Link
            href={`/admin/logs?storeId=${conn.storeId}&logType=WEBHOOK`}
            className="text-blue-600 hover:underline"
          >
            Webhook 로그 →
          </Link>
          <Link
            href={`/admin/jobs?storeId=${conn.storeId}&provider=${conn.provider}`}
            className="text-blue-600 hover:underline"
          >
            Jobs Console →
          </Link>
        </div>
      </div>
    </div>
  );
}
