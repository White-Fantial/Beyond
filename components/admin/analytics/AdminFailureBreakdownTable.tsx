import type { AdminFailureBreakdownRow } from "@/types/admin-analytics";

interface Props {
  rows: AdminFailureBreakdownRow[];
}

const CATEGORY_LABELS: Record<string, string> = {
  webhook: "Webhook 실패",
  sync: "동기화 실패",
  refresh: "토큰 갱신 실패",
  pos_forwarding: "POS 전달 실패",
};

const PROVIDER_LABELS: Record<string, string> = {
  LOYVERSE: "Loyverse",
  UBER_EATS: "Uber Eats",
  DOORDASH: "DoorDash",
  STRIPE: "Stripe",
  OTHER: "기타",
  UNKNOWN: "알 수 없음",
};

export default function AdminFailureBreakdownTable({ rows }: Props) {
  if (rows.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-5 mb-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">실패 분류</h2>
        <p className="text-xs text-gray-400 py-4 text-center">기간 내 실패 기록이 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-5 mb-6">
      <h2 className="text-sm font-semibold text-gray-700 mb-3">실패 분류</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-gray-400 border-b border-gray-100">
              <th className="text-left pb-2 font-medium">구분</th>
              <th className="text-left pb-2 font-medium">공급자 / 매장</th>
              <th className="text-right pb-2 font-medium">건수</th>
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
