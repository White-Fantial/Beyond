import { requireStorePermission } from "@/lib/auth/permissions";
import { PERMISSIONS } from "@/lib/auth/constants";
import { listModifierGroups } from "@/services/catalog.service";
import CatalogModifiersClient from "./CatalogModifiersClient";

export default async function BackofficeModifiersPage({
  params,
}: {
  params: Promise<{ storeId: string }>;
}) {
  const { storeId } = await params;
  await requireStorePermission(storeId, PERMISSIONS.MODIFIER_MANAGE);

  const modifierGroups = await listModifierGroups(storeId);

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 mb-4">Modifiers Management</h1>
      <CatalogModifiersClient storeId={storeId} initialGroups={modifierGroups} />
    </div>
  );
}
