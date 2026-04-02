import { requirePermission } from "@/lib/auth/permissions";
import { PERMISSIONS } from "@/lib/auth/constants";

export default async function OwnerReportsPage() {
  await requirePermission(PERMISSIONS.REPORTS);
  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 mb-4">Reports</h1>
      <p className="text-gray-500">Reports No data available.</p>
    </div>
  );
}
