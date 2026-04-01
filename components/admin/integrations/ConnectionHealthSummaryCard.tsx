import type { AdminConnectionRecoveryContext } from "@/types/admin-analytics";
import StatusBadge from "@/components/admin/StatusBadge";

interface Props {
  ctx: AdminConnectionRecoveryContext;
}

export default function ConnectionHealthSummaryCard({ ctx }: Props) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-5 mb-6">
      <h2 className="text-sm font-semibold text-gray-700 mb-4">연결 건강도 요약</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
        <Row label="현재 상태">
          <StatusBadge value={ctx.status} />
        </Row>
        <Row label="공급자">
          <span className="font-mono text-xs text-gray-700">{ctx.provider}</span>
        </Row>
        <Row label="유형">
          <span className="font-mono text-xs text-gray-700">{ctx.type}</span>
        </Row>
        <Row label="인증 방식">
          <span className="font-mono text-xs text-gray-700">{ctx.authScheme ?? "—"}</span>
        </Row>
        <Row label="마지막 연결">
          {ctx.lastConnectedAt
            ? ctx.lastConnectedAt.toLocaleString("ko-KR")
            : "—"}
        </Row>
        <Row label="마지막 인증 검증">
          {ctx.lastAuthValidatedAt
            ? ctx.lastAuthValidatedAt.toLocaleString("ko-KR")
            : "—"}
        </Row>
        <Row label="마지막 동기화">
          {ctx.lastSyncAt ? ctx.lastSyncAt.toLocaleString("ko-KR") : "—"}
        </Row>
        <Row label="동기화 상태">
          {ctx.lastSyncStatus ? (
            <StatusBadge value={ctx.lastSyncStatus} />
          ) : (
            "—"
          )}
        </Row>
        {ctx.lastErrorCode && (
          <Row label="마지막 오류 코드">
            <span className="font-mono text-xs text-red-600">{ctx.lastErrorCode}</span>
          </Row>
        )}
        {ctx.lastErrorMessage && (
          <div className="sm:col-span-2">
            <Row label="마지막 오류 메시지">
              <span className="text-xs text-red-600">{ctx.lastErrorMessage}</span>
            </Row>
          </div>
        )}
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Tag active={ctx.canRefreshCredentials} label="토큰 갱신 가능" />
        <Tag active={ctx.supportsCatalogSync} label="카탈로그 동기화 지원" />
        <Tag active={ctx.isReauthRequired} label="재인증 필요" warn />
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-gray-400">{label}</span>
      <span className="text-sm text-gray-800">{children}</span>
    </div>
  );
}

function Tag({
  active,
  label,
  warn = false,
}: {
  active: boolean;
  label: string;
  warn?: boolean;
}) {
  if (!active) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-400">
        ✗ {label}
      </span>
    );
  }
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
        warn ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"
      }`}
    >
      ✓ {label}
    </span>
  );
}
