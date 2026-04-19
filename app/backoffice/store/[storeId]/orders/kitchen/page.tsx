import { requireStorePermission } from "@/lib/auth/permissions";
import { PERMISSIONS } from "@/lib/auth/constants";
import KitchenDisplayClient from "./KitchenDisplayClient";

/**
 * /backoffice/store/[storeId]/orders/kitchen
 *
 * Full-screen kitchen display mode — no sidebar, designed for a dedicated tablet.
 * Shows RECEIVED and IN_PROGRESS orders sorted oldest-first.
 */
export default async function KitchenDisplayPage({
  params,
}: {
  params: { storeId: string };
}) {
  const { storeId } = params;
  await requireStorePermission(storeId, PERMISSIONS.ORDERS);

  return <KitchenDisplayClient storeId={storeId} />;
}
