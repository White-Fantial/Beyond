import { requireOwnerPortalAccess } from "@/lib/owner/auth-guard";
import { prisma } from "@/lib/prisma";

const ACTION_LEVEL: Record<string, "INFO" | "WARN" | "ERROR"> = {
  CONNECT_START: "INFO",
  CONNECT_SUCCESS: "INFO",
  REFRESH_SUCCESS: "INFO",
  DISCONNECT: "WARN",
  REAUTH_REQUIRED: "WARN",
  CONNECT_FAIL: "ERROR",
  REFRESH_FAIL: "ERROR",
};

export default async function OwnerLogsPage() {
  const ctx = await requireOwnerPortalAccess();

  const tenantId = ctx.tenantMemberships[0]?.tenantId ?? "";

  const [logs, stores] = tenantId
    ? await Promise.all([
        prisma.connectionActionLog.findMany({
          where: { tenantId },
          orderBy: { createdAt: "desc" },
          take: 50,
          select: {
            id: true,
            actionType: true,
            status: true,
            provider: true,
            storeId: true,
            errorCode: true,
            message: true,
            createdAt: true,
          },
        }),
        prisma.store.findMany({
          where: { tenantId },
          select: { id: true, name: true },
        }),
      ])
    : [[], []];

  const storeMap = Object.fromEntries(
    (stores as { id: string; name: string }[]).map((s) => [s.id, s.name])
  );

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Logs</h1>
        <p className="mt-1 text-sm text-gray-500">최근 50건의 연동 및 시스템 로그입니다.</p>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {logs.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-sm">로그가 없습니다.</div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide w-4" />
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Action</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Provider</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Store</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Message</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {(logs as {
                id: string;
                actionType: string;
                status: string;
                provider: string;
                storeId: string;
                errorCode: string | null;
                message: string | null;
                createdAt: Date;
              }[]).map((log) => {
                const level = ACTION_LEVEL[log.actionType] ?? "INFO";
                return (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block w-2 h-2 rounded-full ${
                          level === "ERROR"
                            ? "bg-red-500"
                            : level === "WARN"
                            ? "bg-yellow-400"
                            : "bg-green-400"
                        }`}
                      />
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900">{log.actionType}</td>
                    <td className="px-4 py-3 text-gray-600">{log.provider}</td>
                    <td className="px-4 py-3 text-gray-600">{log.status}</td>
                    <td className="px-4 py-3 text-gray-500">{storeMap[log.storeId] ?? "—"}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs max-w-xs truncate">
                      {log.message ?? log.errorCode ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-400 whitespace-nowrap">
                      {log.createdAt.toLocaleString("ko-KR")}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

