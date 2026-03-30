import { requireStorePermission } from "@/lib/auth/permissions";
import { PERMISSIONS } from "@/lib/auth/constants";

export default async function BackofficeProductsPage({
  params,
}: {
  params: Promise<{ storeId: string }>;
}) {
  const { storeId } = await params;
  await requireStorePermission(storeId, PERMISSIONS.MENU_MANAGE);

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 mb-4">상품 관리</h1>
      <p className="text-gray-500">등록된 상품이 없습니다.</p>
    </div>
  );
}
