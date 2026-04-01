import StatusBadge from "@/components/admin/StatusBadge";
import AdminEmptyState from "@/components/admin/AdminEmptyState";
import type { AdminWebhookLogItem } from "@/types/admin";

interface WebhookLogTableProps {
  items: AdminWebhookLogItem[];
  emptyMessage?: string;
}

export default function WebhookLogTable({
  items,
  emptyMessage = "No webhook logs.",
}: WebhookLogTableProps) {
  if (items.length === 0) {
    return <AdminEmptyState message={emptyMessage} />;
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      <table className="min-w-full divide-y divide-gray-200 text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left font-medium text-gray-500">Received</th>
            <th className="px-4 py-3 text-left font-medium text-gray-500">Channel</th>
            <th className="px-4 py-3 text-left font-medium text-gray-500 hidden md:table-cell">Event</th>
            <th className="px-4 py-3 text-left font-medium text-gray-500">Processing status</th>
            <th className="px-4 py-3 text-left font-medium text-gray-500 hidden sm:table-cell">Signature</th>
            <th className="px-4 py-3 text-left font-medium text-gray-500 hidden lg:table-cell">Error</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 bg-white">
          {items.map((w) => (
            <tr key={w.id} className="hover:bg-gray-50">
              <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                {w.receivedAt.toLocaleString("en-US")}
              </td>
              <td className="px-4 py-3 font-mono text-xs text-gray-700">
                {w.channelType ?? "—"}
              </td>
              <td className="px-4 py-3 text-gray-500 hidden md:table-cell">
                <div className="font-mono text-xs">{w.eventName ?? "—"}</div>
                {w.externalEventRef && (
                  <div className="text-xs text-gray-400 mt-0.5 truncate max-w-[180px]">
                    {w.externalEventRef}
                  </div>
                )}
              </td>
              <td className="px-4 py-3">
                <StatusBadge value={w.processingStatus} />
              </td>
              <td className="px-4 py-3 hidden sm:table-cell">
                {w.signatureValid === null ? (
                  <span className="text-xs text-gray-400">—</span>
                ) : w.signatureValid ? (
                  <span className="text-xs text-green-600 font-medium">✓ Valid</span>
                ) : (
                  <span className="text-xs text-red-600 font-medium">✗ Failed</span>
                )}
              </td>
              <td className="px-4 py-3 text-xs text-red-500 hidden lg:table-cell truncate max-w-[200px]">
                {w.errorMessage ?? "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
