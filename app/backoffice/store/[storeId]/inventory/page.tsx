import { requireStorePermission } from "@/lib/auth/permissions";
import { PERMISSIONS } from "@/lib/auth/constants";

export default async function BackofficeInventoryPage({
  params,
}: {
  params: Promise<{ storeId: string }>;
}) {
  const { storeId } = await params;
  await requireStorePermission(storeId, PERMISSIONS.INVENTORY);

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 mb-4">재고 / 품절 관리</h1>
      <p className="text-gray-500">현재 품절 메뉴가 없습니다.</p>
    </div>
  );
}
