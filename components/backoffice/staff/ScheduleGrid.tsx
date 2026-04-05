import type { BackofficeStoreHours } from "@/types/backoffice";

interface Props {
  hours: BackofficeStoreHours[];
}

export default function ScheduleGrid({ hours }: Props) {
  if (hours.length === 0) {
    return (
      <div className="py-8 text-center text-gray-400 text-sm">No schedule configured.</div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200">
      <table className="min-w-full text-sm">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            <th className="px-4 py-3 text-left font-medium text-gray-500">Day</th>
            <th className="px-4 py-3 text-left font-medium text-gray-500">Open</th>
            <th className="px-4 py-3 text-left font-medium text-gray-500">Hours</th>
            <th className="px-4 py-3 text-left font-medium text-gray-500">Pickup window</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 bg-white">
          {hours.map((h) => (
            <tr key={h.id}>
              <td className="px-4 py-3 font-medium text-gray-900">{h.dayLabel}</td>
              <td className="px-4 py-3">
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${h.isOpen ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                  {h.isOpen ? "Open" : "Closed"}
                </span>
              </td>
              <td className="px-4 py-3 text-gray-600">
                {h.isOpen ? `${h.openTimeLocal} – ${h.closeTimeLocal}` : "—"}
              </td>
              <td className="px-4 py-3 text-gray-400 text-xs">
                {h.pickupStartTimeLocal && h.pickupEndTimeLocal
                  ? `${h.pickupStartTimeLocal} – ${h.pickupEndTimeLocal}`
                  : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
