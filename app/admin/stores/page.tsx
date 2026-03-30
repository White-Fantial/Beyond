import { requirePermission } from "@/lib/auth/permissions";
import { PERMISSIONS } from "@/lib/auth/constants";

export default async function AdminStoresPage() {
  await requirePermission(PERMISSIONS.PLATFORM_ADMIN);
  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 mb-4">전체 매장</h1>
      <p className="text-gray-500">등록된 매장이 없습니다.</p>
    </div>
  );
}
