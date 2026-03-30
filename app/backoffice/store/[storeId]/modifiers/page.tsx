import { requireStorePermission } from "@/lib/auth/permissions";
import { PERMISSIONS } from "@/lib/auth/constants";

export default async function BackofficeModifiersPage({
  params,
}: {
  params: Promise<{ storeId: string }>;
}) {
  const { storeId } = await params;
  await requireStorePermission(storeId, PERMISSIONS.MODIFIER_MANAGE);

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 mb-4">옵션/수식어 관리</h1>
      <p className="text-gray-500">등록된 옵션 그룹이 없습니다.</p>
    </div>
  );
}
