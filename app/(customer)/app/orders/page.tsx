import { requirePermission } from "@/lib/auth/permissions";
import { PERMISSIONS } from "@/lib/auth/constants";

export default async function CustomerOrdersPage() {
  await requirePermission(PERMISSIONS.CUSTOMER_APP);
  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 mb-4">Order History</h1>
      <p className="text-gray-500">No orders found.</p>
    </div>
  );
}
