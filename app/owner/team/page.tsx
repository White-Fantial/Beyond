import { requirePermission } from "@/lib/auth/permissions";
import { PERMISSIONS } from "@/lib/auth/constants";

export default async function OwnerTeamPage() {
  await requirePermission(PERMISSIONS.STAFF_MANAGE);
  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 mb-4">팀 관리</h1>
      <p className="text-gray-500">팀 멤버가 없습니다.</p>
    </div>
  );
}
