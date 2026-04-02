import { requirePermission } from "@/lib/auth/permissions";
import { PERMISSIONS } from "@/lib/auth/constants";

export default async function OwnerIntegrationsPage() {
  await requirePermission(PERMISSIONS.INTEGRATIONS);
  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 mb-4">Integrations</h1>
      <p className="text-gray-500">No platforms connected.</p>
    </div>
  );
}
