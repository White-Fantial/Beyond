import { requirePermission } from "@/lib/auth/permissions";
import { PERMISSIONS } from "@/lib/auth/constants";

export default async function AdminIntegrationsPage() {
  await requirePermission(PERMISSIONS.PLATFORM_ADMIN);
  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 mb-4">연동 관리</h1>
      <p className="text-gray-500">연동 현황을 불러오는 중입니다.</p>
    </div>
  );
}
