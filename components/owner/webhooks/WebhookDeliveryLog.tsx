import type { WebhookDelivery } from "@/types/owner-webhooks";

interface Props {
  deliveries: WebhookDelivery[];
}

const STATUS_STYLES: Record<string, string> = {
  SUCCESS: "bg-green-100 text-green-700",
  FAILED: "bg-red-100 text-red-700",
  PENDING: "bg-yellow-100 text-yellow-700",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("en-NZ", {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
}

export default function WebhookDeliveryLog({ deliveries }: Props) {
  if (deliveries.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6 text-center text-sm text-gray-500">
        No deliveries yet.
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100">
        <h3 className="text-sm font-semibold text-gray-900">Delivery Log</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-gray-500 bg-gray-50">
              <th className="px-5 py-2.5 text-left font-medium">Date</th>
              <th className="px-5 py-2.5 text-left font-medium">Event</th>
              <th className="px-5 py-2.5 text-left font-medium">Status</th>
              <th className="px-5 py-2.5 text-right font-medium">HTTP</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {deliveries.map((d) => (
              <tr key={d.id} className="hover:bg-gray-50">
                <td className="px-5 py-3 text-gray-600 whitespace-nowrap text-xs">
                  {formatDate(d.createdAt)}
                </td>
                <td className="px-5 py-3">
                  <span className="font-mono text-xs text-gray-700">{d.event}</span>
                </td>
                <td className="px-5 py-3">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[d.status] ?? "bg-gray-100 text-gray-600"}`}>
                    {d.status}
                  </span>
                </td>
                <td className="px-5 py-3 text-right font-mono text-xs text-gray-600">
                  {d.httpStatus ?? "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
