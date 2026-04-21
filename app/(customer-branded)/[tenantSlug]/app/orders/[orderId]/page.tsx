import { notFound } from "next/navigation";
import Link from "next/link";
import { requirePermission } from "@/lib/auth/permissions";
import { PERMISSIONS } from "@/lib/auth/constants";
import { getCustomerOrderDetail, CustomerOrderNotFoundError } from "@/services/customer.service";
import { OrderDetailCard } from "@/components/customer/orders/OrderDetailCard";
import { OrderItemsTable } from "@/components/customer/orders/OrderItemsTable";
import { OrderEventTimeline } from "@/components/customer/orders/OrderEventTimeline";

interface Props {
  params: Promise<{ tenantSlug: string; orderId: string }>;
}

export default async function BrandedOrderDetailPage({ params }: Props) {
  const ctx = await requirePermission(PERMISSIONS.CUSTOMER_APP);
  const { tenantSlug, orderId } = await params;

  let order;
  try {
    order = await getCustomerOrderDetail(orderId, ctx.email);
  } catch (err) {
    if (err instanceof CustomerOrderNotFoundError) notFound();
    throw err;
  }

  const base = `/${tenantSlug}/app`;

  return (
    <div>
      <div className="mb-4">
        <Link href={`${base}/orders`} className="text-xs text-gray-500 hover:text-gray-700">
          ← 주문 목록으로
        </Link>
      </div>

      <h1 className="text-xl font-bold text-gray-900 mb-4">주문 상세</h1>

      <div className="space-y-6">
        <OrderDetailCard order={order} />

        <div>
          <h2 className="text-sm font-semibold text-gray-700 mb-2">
            주문 항목 ({order.items.length})
          </h2>
          <div className="bg-white rounded-xl border border-gray-200 px-4">
            <OrderItemsTable items={order.items} />
          </div>
        </div>

        {order.events.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-gray-700 mb-3">처리 내역</h2>
            <div className="bg-white rounded-xl border border-gray-200 px-4 py-4">
              <OrderEventTimeline events={order.events} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
