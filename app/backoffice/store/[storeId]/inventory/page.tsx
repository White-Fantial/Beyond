import { requireStorePermission } from "@/lib/auth/permissions";
import { PERMISSIONS } from "@/lib/auth/constants";
import { listProductsGroupedByCategory } from "@/services/catalog.service";
import InventoryClient from "./InventoryClient";

export default async function BackofficeInventoryPage({
  params,
}: {
  params: Promise<{ storeId: string }>;
}) {
  const { storeId } = await params;
  await requireStorePermission(storeId, PERMISSIONS.INVENTORY);

  const groups = await listProductsGroupedByCategory(storeId);

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 mb-1">재고 / 품절 관리</h1>
      <p className="text-sm text-gray-500 mb-6">
        상품을 품절로 표시하면 온라인 주문에서 주문이 불가능해집니다.
      </p>
      <InventoryClient initialGroups={groups} />
    </div>
  );
}
