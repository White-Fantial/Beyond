import type { ProductionEstimatesData } from "@/types/owner-analytics";

interface Props {
  data: ProductionEstimatesData;
}

function DeltaBadge({ delta }: { delta: number }) {
  if (delta === 0) return <span className="text-xs text-gray-400">—</span>;
  const positive = delta > 0;
  return (
    <span className={`text-xs font-medium ${positive ? "text-green-600" : "text-red-500"}`}>
      {positive ? "▲" : "▼"} {Math.abs(delta)}
    </span>
  );
}

export default function ProductionEstimateTable({ data }: Props) {
  if (data.stores.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6 text-center">
        <p className="text-sm font-medium text-gray-600">No production data available</p>
        <p className="text-xs text-gray-400 mt-1">No stores found for this tenant.</p>
      </div>
    );
  }

  // Collect all unique day labels from first store (they are the same for all stores)
  const days = data.stores[0]?.days ?? [];

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="p-4 border-b border-gray-100">
        <h2 className="text-base font-semibold text-gray-900">Production Estimates</h2>
        <p className="text-xs text-gray-400 mt-0.5">
          Next-week order volume forecast — week starting {data.weekStartDate}
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">Store</th>
              {days.map((d) => (
                <th key={d.date} className="text-center px-2 py-2.5 text-xs font-medium text-gray-500">
                  {d.dayLabel}
                  <div className="font-normal text-gray-400">{d.date.slice(5)}</div>
                </th>
              ))}
              <th className="text-center px-4 py-2.5 text-xs font-medium text-gray-500">Week Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data.stores.map((store) => (
              <tr key={store.storeId} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900 text-sm">{store.storeName}</td>
                {store.days.map((day) => (
                  <td key={day.date} className="px-2 py-3 text-center">
                    <div className="font-semibold text-gray-900 text-sm">{day.estimated}</div>
                    <DeltaBadge delta={day.delta} />
                  </td>
                ))}
                <td className="px-4 py-3 text-center font-bold text-gray-900">{store.weekTotal}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="px-4 py-2 bg-gray-50 border-t border-gray-100">
        <p className="text-xs text-gray-400">
          ▲▼ delta vs prior 4-week same-weekday average
        </p>
      </div>
    </div>
  );
}
