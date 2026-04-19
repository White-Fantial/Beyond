import { requireStorePermission } from "@/lib/auth/permissions";
import { PERMISSIONS } from "@/lib/auth/constants";
import BackofficeOrdersClient from "./BackofficeOrdersClient";

export default async function BackofficeOrdersPage({
  params,
}: {
  params: { storeId: string };
}) {
  const { storeId } = params;
  await requireStorePermission(storeId, PERMISSIONS.ORDERS);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-gray-900">Live Orders</h1>
      </div>
      <BackofficeOrdersClient storeId={storeId} />
    </div>
  );
}
