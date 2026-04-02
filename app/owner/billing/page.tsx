import { requirePermission } from "@/lib/auth/permissions";
import { PERMISSIONS } from "@/lib/auth/constants";

export default async function OwnerBillingPage() {
  await requirePermission(PERMISSIONS.BILLING);
  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 mb-4">Billing / Subscription Management</h1>
      <p className="text-gray-500">No plan information available.</p>
    </div>
  );
}
