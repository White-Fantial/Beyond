import type { CustomerOrderSummary } from "@/types/customer";

export const ORDER_STATUS_LABELS: Record<string, string> = {
  RECEIVED: "Received",
  ACCEPTED: "Accepted",
  IN_PROGRESS: "In Progress",
  READY: "Ready",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  FAILED: "Failed",
};

const ORDER_STATUS_BADGE_CLASS: Record<string, string> = {
  RECEIVED: "bg-blue-100 text-blue-700",
  ACCEPTED: "bg-indigo-100 text-indigo-700",
  IN_PROGRESS: "bg-yellow-100 text-yellow-700",
  READY: "bg-green-100 text-green-700",
  COMPLETED: "bg-gray-100 text-gray-600",
  CANCELLED: "bg-red-100 text-red-700",
  FAILED: "bg-red-100 text-red-700",
};

export const CHANNEL_LABELS: Record<string, string> = {
  ONLINE: "Online",
  SUBSCRIPTION: "Subscription",
  POS: "POS",
  UBER_EATS: "Uber Eats",
  DOORDASH: "DoorDash",
  MANUAL: "Manual",
  UNKNOWN: "Unknown",
};

export function OrderStatusBadge({ status }: { status: string }) {
  const label = ORDER_STATUS_LABELS[status] ?? status;
  const cls = ORDER_STATUS_BADGE_CLASS[status] ?? "bg-gray-100 text-gray-600";
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${cls}`}>
      {label}
    </span>
  );
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-NZ", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function fmtAmount(minor: number, currency: string) {
  return new Intl.NumberFormat("en-NZ", {
    style: "currency",
    currency,
  }).format(minor / 100);
}

interface OrderListTableProps {
  orders: CustomerOrderSummary[];
}

export function OrderListTable({ orders }: OrderListTableProps) {
  if (orders.length === 0) {
    return <p className="text-gray-500 text-sm">No orders found.</p>;
  }

  return (
    <div className="divide-y divide-gray-100">
      {orders.map((order) => (
        <a
          key={order.id}
          href={`/app/orders/${order.id}`}
          className="flex items-center justify-between py-3 hover:bg-gray-50 rounded-lg px-2 -mx-2 transition"
        >
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <OrderStatusBadge status={order.status} />
              <span className="text-xs text-gray-400">
                {CHANNEL_LABELS[order.sourceChannel] ?? order.sourceChannel}
              </span>
            </div>
            <div className="mt-0.5 text-sm font-medium text-gray-900 truncate">
              {order.storeName ?? "Unknown Store"}
            </div>
            <div className="text-xs text-gray-400 mt-0.5">
              {fmtDate(order.orderedAt)} · {order.itemCount}{" "}
              {order.itemCount === 1 ? "item" : "items"}
            </div>
          </div>
          <div className="ml-4 shrink-0 text-right">
            <div className="text-sm font-semibold text-gray-900">
              {fmtAmount(order.totalAmount, order.currencyCode)}
            </div>
            <div className="text-xs text-gray-400 mt-0.5">›</div>
          </div>
        </a>
      ))}
    </div>
  );
}
