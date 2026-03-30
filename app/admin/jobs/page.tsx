import { requirePermission } from "@/lib/auth/permissions";
import { PERMISSIONS } from "@/lib/auth/constants";

export default async function AdminJobsPage() {
  await requirePermission(PERMISSIONS.PLATFORM_ADMIN);
  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 mb-4">백그라운드 작업</h1>
      <p className="text-gray-500">실행 중인 작업이 없습니다.</p>
    </div>
  );
}
