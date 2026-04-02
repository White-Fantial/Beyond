import type { AdminFailureBreakdownRow } from "@/types/admin-analytics";

interface Props {
  rows: AdminFailureBreakdownRow[];
}

const CATEGORY_LABELS: Record<string, string> = {
  webhook: "Webhook Failures",
  sync: "Sync 실패",
  refresh: "Token Refresh Failures",
  pos_forwarding: "Forward to POS 실패",
};

const PROVIDER_LABELS: Record<string, string> = {
  LOYVERSE: "Loyverse",
  UBER_EATS: "Uber Eats",
  DOORDASH: "DoorDash",
  STRIPE: "Stripe",
  OTHER: "Other",
  UNKNOWN: "Unknown",
};

export default function AdminFailureBreakdownTable({ rows }: Props) {
  if (rows.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-5 mb-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Failure Breakdown</h2>
        <p className="text-xs text-gray-400 py-4 text-center">No failure records for the selected period.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-5 mb-6">
      <h2 className="text-sm font-semibold text-gray-700 mb-3">Failure Breakdown</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-gray-400 border-b border-gray-100">
              <th className="text-left pb-2 font-medium">Category</th>
              <th className="text-left pb-2 font-medium">Provider / Store</th>
              <th className="text-right pb-2 font-medium">Count</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-b border-gray-50 last:border-0">
                <td className="py-2 text-gray-700">
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-50 text-red-700">
                    {CATEGORY_LABELS[r.category] ?? r.category}
                  </span>
                </td>
                <td className="py-2 text-gray-500 font-mono text-xs">
                  {PROVIDER_LABELS[r.provider] ?? r.provider}
                </td>
                <td className="py-2 text-right font-semibold text-red-700">{r.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
