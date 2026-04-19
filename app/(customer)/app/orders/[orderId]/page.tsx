import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth/permissions";
import { PERMISSIONS } from "@/lib/auth/constants";
import { getCustomerOrderDetail, CustomerOrderNotFoundError } from "@/services/customer.service";
import { OrderDetailCard } from "@/components/customer/orders/OrderDetailCard";
import { OrderItemsTable } from "@/components/customer/orders/OrderItemsTable";
import { OrderEventTimeline } from "@/components/customer/orders/OrderEventTimeline";

interface Props {
  params: { orderId: string };
}

export default async function CustomerOrderDetailPage({ params }: Props) {
  const ctx = await requirePermission(PERMISSIONS.CUSTOMER_APP);
  const { orderId } = params;

  let order;
  try {
    order = await getCustomerOrderDetail(orderId, ctx.email);
  } catch (err) {
    if (err instanceof CustomerOrderNotFoundError) notFound();
    throw err;
  }

  return (
    <div>
      <div className="mb-4">
        <Link href="/app/orders" className="text-xs text-gray-500 hover:text-gray-700">
          ← Back to Orders
        </Link>
      </div>

      <h1 className="text-xl font-bold text-gray-900 mb-4">Order Details</h1>

      <div className="space-y-6">
        {/* Summary card */}
        <OrderDetailCard order={order} />

        {/* Items */}
        <div>
          <h2 className="text-sm font-semibold text-gray-700 mb-2">
            Items ({order.items.length})
          </h2>
          <div className="bg-white rounded-xl border border-gray-200 px-4">
            <OrderItemsTable items={order.items} currency={order.currencyCode} />
          </div>
        </div>

        {/* Timeline */}
        {order.events.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-gray-700 mb-3">Status History</h2>
            <div className="bg-white rounded-xl border border-gray-200 px-4 py-4">
              <OrderEventTimeline events={order.events} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
