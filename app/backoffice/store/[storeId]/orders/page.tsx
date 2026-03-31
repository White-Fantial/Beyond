import { requireStorePermission } from "@/lib/auth/permissions";
import { PERMISSIONS } from "@/lib/auth/constants";
import { listOrders } from "@/services/order.service";
import BackofficeOrdersClient from "./BackofficeOrdersClient";

export default async function BackofficeOrdersPage({
  params,
}: {
  params: Promise<{ storeId: string }>;
}) {
  const { storeId } = await params;
  await requireStorePermission(storeId, PERMISSIONS.ORDERS);

  const { orders, total } = await listOrders(storeId, { limit: 50 });

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 mb-4">주문 관리</h1>
      <BackofficeOrdersClient
        storeId={storeId}
        initialOrders={orders}
        initialTotal={total}
      />
    </div>
  );
}
