import { requireStorePermission } from "@/lib/auth/permissions";
import { PERMISSIONS } from "@/lib/auth/constants";

export default async function BackofficeCategoriesPage({
  params,
}: {
  params: Promise<{ storeId: string }>;
}) {
  const { storeId } = await params;
  await requireStorePermission(storeId, PERMISSIONS.CATEGORY_MANAGE);

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 mb-4">카테고리 관리</h1>
      <p className="text-gray-500">등록된 카테고리가 없습니다.</p>
    </div>
  );
}
