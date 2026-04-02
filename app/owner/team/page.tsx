import { requirePermission } from "@/lib/auth/permissions";
import { PERMISSIONS } from "@/lib/auth/constants";

export default async function OwnerTeamPage() {
  await requirePermission(PERMISSIONS.STAFF_MANAGE);
  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 mb-4">Team Management</h1>
      <p className="text-gray-500">No team members.</p>
    </div>
  );
}
