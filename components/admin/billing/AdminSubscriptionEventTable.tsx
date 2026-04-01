import { labelSubscriptionEventType } from "@/lib/billing/labels";
import type { SubscriptionEventRow } from "@/types/admin-billing";

interface Props {
  events: SubscriptionEventRow[];
}

export default function AdminSubscriptionEventTable({ events }: Props) {
  if (events.length === 0) {
    return <p className="text-sm text-gray-400 py-4 text-center">이벤트 기록이 없습니다.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-xs text-gray-500 border-b border-gray-200">
            <th className="text-left pb-2 pr-3">이벤트</th>
            <th className="text-left pb-2 pr-3">상태 변경</th>
            <th className="text-left pb-2 pr-3">플랜 변경</th>
            <th className="text-left pb-2 pr-3">담당자</th>
            <th className="text-left pb-2 pr-3">메모</th>
            <th className="text-right pb-2">일시</th>
          </tr>
        </thead>
        <tbody>
          {events.map((e) => (
            <tr key={e.id} className="border-b border-gray-50 last:border-0">
              <td className="py-2 pr-3 font-medium">{labelSubscriptionEventType(e.eventType)}</td>
              <td className="py-2 pr-3 text-xs text-gray-600">
                {e.fromStatus || e.toStatus ? (
                  <span>
                    {e.fromStatus ?? "—"} → {e.toStatus ?? "—"}
                  </span>
                ) : (
                  "—"
                )}
              </td>
              <td className="py-2 pr-3 text-xs text-gray-600">
                {e.fromPlanCode || e.toPlanCode ? (
                  <span>
                    {e.fromPlanCode ?? "—"} → {e.toPlanCode ?? "—"}
                  </span>
                ) : (
                  "—"
                )}
              </td>
              <td className="py-2 pr-3 text-xs text-gray-500">{e.actorLabel ?? "—"}</td>
              <td className="py-2 pr-3 text-xs text-gray-500 max-w-xs truncate">
                {e.note ?? "—"}
              </td>
              <td className="py-2 text-right text-xs text-gray-400">
                {new Date(e.createdAt).toLocaleString("ko-KR")}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
