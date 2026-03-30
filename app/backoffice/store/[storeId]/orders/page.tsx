import { requireStorePermission } from "@/lib/auth/permissions";
import { PERMISSIONS } from "@/lib/auth/constants";

export default async function BackofficeOrdersPage({
  params,
}: {
  params: Promise<{ storeId: string }>;
}) {
  const { storeId } = await params;
  await requireStorePermission(storeId, PERMISSIONS.ORDERS);

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 mb-4">주문 관리</h1>
      <p className="text-gray-500">현재 진행 중인 주문이 없습니다.</p>
    </div>
  );
}
