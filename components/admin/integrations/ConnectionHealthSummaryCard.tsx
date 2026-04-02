import type { AdminConnectionRecoveryContext } from "@/types/admin-analytics";
import StatusBadge from "@/components/admin/StatusBadge";

interface Props {
  ctx: AdminConnectionRecoveryContext;
}

export default function ConnectionHealthSummaryCard({ ctx }: Props) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-5 mb-6">
      <h2 className="text-sm font-semibold text-gray-700 mb-4">Connection Health Summary</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
        <Row label="Current Status">
          <StatusBadge value={ctx.status} />
        </Row>
        <Row label="Provider">
          <span className="font-mono text-xs text-gray-700">{ctx.provider}</span>
        </Row>
        <Row label="Type">
          <span className="font-mono text-xs text-gray-700">{ctx.type}</span>
        </Row>
        <Row label="Auth Method">
          <span className="font-mono text-xs text-gray-700">{ctx.authScheme ?? "—"}</span>
        </Row>
        <Row label="Last Connected">
          {ctx.lastConnectedAt
            ? ctx.lastConnectedAt.toLocaleString("en-US")
            : "—"}
        </Row>
        <Row label="Last Auth Validated">
          {ctx.lastAuthValidatedAt
            ? ctx.lastAuthValidatedAt.toLocaleString("en-US")
            : "—"}
        </Row>
        <Row label="Last Sync">
          {ctx.lastSyncAt ? ctx.lastSyncAt.toLocaleString("en-US") : "—"}
        </Row>
        <Row label="Sync Status">
          {ctx.lastSyncStatus ? (
            <StatusBadge value={ctx.lastSyncStatus} />
          ) : (
            "—"
          )}
        </Row>
        {ctx.lastErrorCode && (
          <Row label="Last Error Code">
            <span className="font-mono text-xs text-red-600">{ctx.lastErrorCode}</span>
          </Row>
        )}
        {ctx.lastErrorMessage && (
          <div className="sm:col-span-2">
            <Row label="Last Error Message">
              <span className="text-xs text-red-600">{ctx.lastErrorMessage}</span>
            </Row>
          </div>
        )}
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Tag active={ctx.canRefreshCredentials} label="Token Refresh Supported" />
        <Tag active={ctx.supportsCatalogSync} label="Catalog Sync Supported" />
        <Tag active={ctx.isReauthRequired} label="Reauth Required" warn />
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
