import type { BackofficeActiveOrder } from "@/types/backoffice";

const STATUS_LABELS: Record<string, string> = {
  RECEIVED: "Received",
  ACCEPTED: "Accepted",
  IN_PROGRESS: "Preparing",
  READY: "Ready",
};

const STATUS_COLORS: Record<string, string> = {
  RECEIVED: "bg-blue-100 text-blue-800",
  ACCEPTED: "bg-indigo-100 text-indigo-800",
  IN_PROGRESS: "bg-yellow-100 text-yellow-800",
  READY: "bg-green-100 text-green-800",
};

const CHANNEL_LABELS: Record<string, string> = {
  POS: "POS",
  UBER_EATS: "Uber Eats",
  DOORDASH: "DoorDash",
  ONLINE: "Online",
  SUBSCRIPTION: "Sub",
  MANUAL: "Manual",
  UNKNOWN: "Unknown",
};

function ageLabel(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h ${m}m`;
}

function ageClass(minutes: number): string {
  if (minutes >= 30) return "text-red-600 font-semibold";
  if (minutes >= 15) return "text-amber-600 font-medium";
  return "text-gray-400";
}

function currencySymbol(code: string): string {
  const map: Record<string, string> = { NZD: "$", AUD: "$", USD: "$", GBP: "£", EUR: "€" };
  return map[code] ?? `${code} `;
}

interface Props {
  orders: BackofficeActiveOrder[];
}

export default function DashboardActiveOrdersList({ orders }: Props) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <h2 className="text-base font-semibold text-gray-900 mb-4">
        Active Orders{" "}
        {orders.length > 0 && (
          <span className="ml-1 inline-flex items-center justify-center w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold">
            {orders.length}
          </span>
        )}
      </h2>

      {orders.length === 0 ? (
        <p className="text-sm text-gray-400">No active orders right now. 🎉</p>
      ) : (
        <div className="divide-y divide-gray-100">
          {orders.map((order) => (
            <div
              key={order.id}
              className="py-2.5 flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                    STATUS_COLORS[order.status] ?? "bg-gray-100 text-gray-600"
                  }`}
                >
                  {STATUS_LABELS[order.status] ?? order.status}
                </span>
                <span className="text-xs text-gray-500 truncate">
                  {CHANNEL_LABELS[order.sourceChannel] ?? order.sourceChannel}
                  {order.customerName ? ` · ${order.customerName}` : ""}
                </span>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-xs font-semibold text-gray-800">
                  {currencySymbol(order.currencyCode)}
                  {(order.totalAmount / 100).toFixed(2)}
                </span>
                <span className={`text-xs ${ageClass(order.ageMinutes)}`}>
                  {ageLabel(order.ageMinutes)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
