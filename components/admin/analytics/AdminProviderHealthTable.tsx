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
  OTHER: "기타",
};

export default function AdminProviderHealthTable({ rows }: Props) {
  if (rows.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-5 mb-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">공급자별 연결 건강도</h2>
        <p className="text-xs text-gray-400 py-4 text-center">데이터가 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-5 mb-6">
      <h2 className="text-sm font-semibold text-gray-700 mb-3">공급자별 연결 건강도</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-gray-400 border-b border-gray-100">
              <th className="text-left pb-2 font-medium">공급자</th>
              <th className="text-right pb-2 font-medium">연결됨</th>
              <th className="text-right pb-2 font-medium">오류</th>
              <th className="text-right pb-2 font-medium">재인증</th>
              <th className="text-right pb-2 font-medium">해제</th>
              <th className="text-right pb-2 font-medium">전체</th>
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
          ? `${rows.reduce((acc, r) => acc + r.reauthRequired, 0)}개 연결이 재인증을 필요로 합니다.`
          : "모든 공급자 연결이 정상 상태입니다."}
      </p>
      <div className="hidden">
        <StatusBadge value="" />
      </div>
    </div>
  );
}
