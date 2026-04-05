import type { ReferralHistoryEntry } from "@/types/customer-referrals";

interface Props {
  history: ReferralHistoryEntry[];
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-NZ", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function ReferralHistoryTable({ history }: Props) {
  if (history.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6 text-center">
        <div className="text-3xl mb-2">🎁</div>
        <p className="text-sm text-gray-500">No referral history yet. Share your code to get started!</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100">
        <h3 className="text-sm font-semibold text-gray-900">Referral History</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-gray-500 bg-gray-50">
              <th className="px-5 py-2.5 text-left font-medium">Date</th>
              <th className="px-5 py-2.5 text-left font-medium">Description</th>
              <th className="px-5 py-2.5 text-right font-medium">Points</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {history.map((entry) => (
              <tr key={entry.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-5 py-3 text-gray-600 whitespace-nowrap">
                  {formatDate(entry.createdAt)}
                </td>
                <td className="px-5 py-3 text-gray-700">
                  {entry.description ?? "Referral reward"}
                </td>
                <td className={`px-5 py-3 text-right font-semibold whitespace-nowrap ${entry.pointsDelta > 0 ? "text-green-600" : "text-red-600"}`}>
                  {entry.pointsDelta > 0 ? "+" : ""}{entry.pointsDelta} pts
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
