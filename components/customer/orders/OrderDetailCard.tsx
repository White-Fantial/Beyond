import type { CustomerOrderDetail } from "@/types/customer";
import { CHANNEL_LABELS, OrderStatusBadge } from "./OrderListTable";

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-NZ", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function fmtAmount(minor: number, currency: string) {
  return new Intl.NumberFormat("en-NZ", { style: "currency", currency }).format(minor / 100);
}

interface OrderDetailCardProps {
  order: CustomerOrderDetail;
}

export function OrderDetailCard({ order }: OrderDetailCardProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <OrderStatusBadge status={order.status} />
        <span className="text-xs text-gray-400">
          {CHANNEL_LABELS[order.sourceChannel] ?? order.sourceChannel}
        </span>
      </div>
      <div>
        <div className="text-sm text-gray-500">Store</div>
        <div className="font-medium text-gray-900">{order.storeName ?? "—"}</div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <div className="text-xs text-gray-400">Ordered</div>
          <div className="text-sm text-gray-900">{fmtDate(order.orderedAt)}</div>
        </div>
        {order.completedAt && (
          <div>
            <div className="text-xs text-gray-400">Completed</div>
            <div className="text-sm text-gray-900">{fmtDate(order.completedAt)}</div>
          </div>
        )}
        {order.cancelledAt && (
          <div>
            <div className="text-xs text-gray-400">Cancelled</div>
            <div className="text-sm text-gray-900">{fmtDate(order.cancelledAt)}</div>
          </div>
        )}
      </div>
      {order.notes && (
        <div>
          <div className="text-xs text-gray-400">Notes</div>
          <div className="text-sm text-gray-700">{order.notes}</div>
        </div>
      )}
      <div className="border-t border-gray-100 pt-3 space-y-1">
        <div className="flex justify-between text-sm text-gray-500">
          <span>Subtotal</span>
          <span>{fmtAmount(order.subtotalAmount, order.currencyCode)}</span>
        </div>
        {order.discountAmount > 0 && (
          <div className="flex justify-between text-sm text-green-600">
            <span>Discount</span>
            <span>−{fmtAmount(order.discountAmount, order.currencyCode)}</span>
          </div>
        )}
        {order.taxAmount > 0 && (
          <div className="flex justify-between text-sm text-gray-500">
            <span>Tax</span>
            <span>{fmtAmount(order.taxAmount, order.currencyCode)}</span>
          </div>
        )}
        {order.tipAmount > 0 && (
          <div className="flex justify-between text-sm text-gray-500">
            <span>Tip</span>
            <span>{fmtAmount(order.tipAmount, order.currencyCode)}</span>
          </div>
        )}
        <div className="flex justify-between text-base font-semibold text-gray-900 pt-1 border-t border-gray-100">
          <span>Total</span>
          <span>{fmtAmount(order.totalAmount, order.currencyCode)}</span>
        </div>
      </div>
    </div>
  );
}
