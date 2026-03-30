import { requirePermission } from "@/lib/auth/permissions";
import { PERMISSIONS } from "@/lib/auth/constants";

export default async function AdminTenantsPage() {
  await requirePermission(PERMISSIONS.PLATFORM_ADMIN);
  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 mb-4">테넌트 관리</h1>
      <p className="text-gray-500">등록된 테넌트가 없습니다.</p>
    </div>
  );
}
