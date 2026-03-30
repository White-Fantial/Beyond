import { requirePermission } from "@/lib/auth/permissions";
import { PERMISSIONS } from "@/lib/auth/constants";

export default async function OwnerStoresPage() {
  await requirePermission(PERMISSIONS.STORE_SETTINGS);
  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 mb-4">매장 관리</h1>
      <p className="text-gray-500">등록된 매장이 없습니다.</p>
    </div>
  );
}
