import type { AdminProviderHealthRow } from "@/types/admin-analytics";
import StatusBadge from "@/components/admin/StatusBadge";

interface Props {
  rows: AdminProviderHealthRow[];
}

const PROVIDER_LABELS: Record<string, string> = {
  LOYVERSE: "Loyverse",
  UBER_EATS: "Uber Eats",
  DOORDASH: "DoorDash",
  STRIPE: "Stripe",
  OTHER: "Other",
};

export default function AdminProviderHealthTable({ rows }: Props) {
  if (rows.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-5 mb-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Connection Health by Provider</h2>
        <p className="text-xs text-gray-400 py-4 text-center">No data available.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-5 mb-6">
      <h2 className="text-sm font-semibold text-gray-700 mb-3">Connection Health by Provider</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-gray-400 border-b border-gray-100">
              <th className="text-left pb-2 font-medium">Provider</th>
              <th className="text-right pb-2 font-medium">Connected</th>
              <th className="text-right pb-2 font-medium">Error</th>
              <th className="text-right pb-2 font-medium">Re-authenticate</th>
              <th className="text-right pb-2 font-medium">Disconnected</th>
              <th className="text-right pb-2 font-medium">All</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const healthPct =
                r.total > 0 ? Math.round((r.connected / r.total) * 100) : 0;
              return (
                <tr key={r.provider} className="border-b border-gray-50 last:border-0">
                  <td className="py-2.5 font-medium text-gray-700">
                    {PROVIDER_LABELS[r.provider] ?? r.provider}
                  </td>
                  <td className="py-2.5 text-right text-green-700 font-medium">{r.connected}</td>
                  <td className="py-2.5 text-right text-red-600">{r.error}</td>
                  <td className="py-2.5 text-right text-yellow-600">{r.reauthRequired}</td>
                  <td className="py-2.5 text-right text-gray-400">{r.disconnected}</td>
                  <td className="py-2.5 text-right">
                    <span className="text-gray-700 font-semibold">{r.total}</span>
                    <span className="text-xs text-gray-400 ml-1">({healthPct}%)</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-gray-400 mt-3 italic">
        {rows.reduce((acc, r) => acc + r.reauthRequired, 0) > 0
          ? `${rows.reduce((acc, r) => acc + r.reauthRequired, 0)} more 연결이 Re-authenticate을 필요로 합니다.`
          : "All provider connections are healthy."}
      </p>
      <div className="hidden">
        <StatusBadge value="" />
      </div>
    </div>
  );
}
