import StatusBadge from "@/components/admin/StatusBadge";

interface ActionLogRow {
  id: string;
  actionType: string;
  status: string;
  actorUserId: string | null;
  message: string | null;
  errorCode: string | null;
  createdAt: Date;
}

interface AuditLogRow {
  id: string;
  action: string;
  actorUserId: string | null;
  createdAt: Date;
}

interface Props {
  actionLogs: ActionLogRow[];
  auditLogs: AuditLogRow[];
}

export default function RelatedLogList({ actionLogs, auditLogs }: Props) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-5 mb-6">
      <h2 className="text-sm font-semibold text-gray-700 mb-4">Related Logs</h2>

      {/* Action Logs */}
      <div className="mb-5">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
          Connection Action Logs
        </h3>
        {actionLogs.length === 0 ? (
          <p className="text-xs text-gray-400 py-2">No action logs found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-400 border-b border-gray-100">
                  <th className="text-left pb-2 font-medium">Action</th>
                  <th className="text-left pb-2 font-medium">Result</th>
                  <th className="text-left pb-2 font-medium">Message</th>
                  <th className="text-left pb-2 font-medium">Time</th>
                </tr>
              </thead>
              <tbody>
                {actionLogs.map((l) => (
                  <tr key={l.id} className="border-b border-gray-50 last:border-0">
                    <td className="py-2">
                      <span className="font-mono text-xs text-gray-700">{l.actionType}</span>
                    </td>
                    <td className="py-2">
                      <StatusBadge value={l.status} />
                    </td>
                    <td className="py-2 text-xs text-gray-500 max-w-xs truncate">
                      {l.message ?? l.errorCode ?? "—"}
                    </td>
                    <td className="py-2 text-xs text-gray-400">
                      {l.createdAt.toLocaleString("en-US")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Audit Logs */}
      <div>
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
          Audit Logs
        </h3>
        {auditLogs.length === 0 ? (
          <p className="text-xs text-gray-400 py-2">No audit logs found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-400 border-b border-gray-100">
                  <th className="text-left pb-2 font-medium">Event</th>
                  <th className="text-left pb-2 font-medium">Actor</th>
                  <th className="text-left pb-2 font-medium">Time</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.map((l) => (
                  <tr key={l.id} className="border-b border-gray-50 last:border-0">
                    <td className="py-2">
                      <span className="font-mono text-xs text-gray-700">{l.action}</span>
                    </td>
                    <td className="py-2 text-xs text-gray-500 font-mono">
                      {l.actorUserId ? l.actorUserId.slice(0, 8) + "..." : "system"}
                    </td>
                    <td className="py-2 text-xs text-gray-400">
                      {l.createdAt.toLocaleString("en-US")}
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
