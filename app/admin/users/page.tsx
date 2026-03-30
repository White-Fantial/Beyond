import { requirePermission } from "@/lib/auth/permissions";
import { PERMISSIONS } from "@/lib/auth/constants";

export default async function AdminUsersPage() {
  await requirePermission(PERMISSIONS.PLATFORM_ADMIN);
  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 mb-4">사용자 관리</h1>
      <p className="text-gray-500">사용자 목록을 불러오는 중입니다.</p>
    </div>
  );
}
