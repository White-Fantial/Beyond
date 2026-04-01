import type { TenantConnectionSummaryRow } from "@/types/admin";
import AdminEmptyState from "./AdminEmptyState";

interface ConnectionSummaryTableProps {
  rows: TenantConnectionSummaryRow[];
}

export default function ConnectionSummaryTable({ rows }: ConnectionSummaryTableProps) {
  if (rows.length === 0) {
    return <AdminEmptyState message="No connection information." />;
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      <table className="min-w-full divide-y divide-gray-200 text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left font-medium text-gray-500">Provider</th>
            <th className="px-4 py-3 text-right font-medium text-gray-500">Total</th>
            <th className="px-4 py-3 text-right font-medium text-gray-500">Connected</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 bg-white">
          {rows.map((r) => (
            <tr key={r.provider} className="hover:bg-gray-50">
              <td className="px-4 py-3 font-medium text-gray-900">{r.provider}</td>
              <td className="px-4 py-3 text-right text-gray-700">{r.total}</td>
              <td className="px-4 py-3 text-right">
                <span className={r.connected > 0 ? "text-green-700 font-medium" : "text-gray-400"}>
                  {r.connected}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
