import { requirePermission } from "@/lib/auth/permissions";
import { PERMISSIONS } from "@/lib/auth/constants";

export default async function OwnerSettingsPage() {
  await requirePermission(PERMISSIONS.STORE_SETTINGS);
  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 mb-4">매장 설정</h1>
      <p className="text-gray-500">설정 항목을 불러오는 중입니다.</p>
    </div>
  );
}
