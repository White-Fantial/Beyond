import { requireOwnerStoreAccess, resolveActorTenantId } from "@/services/owner/owner-authz.service";
import { listStoreModifierGroupSelections } from "@/services/owner/owner-tenant-modifiers.service";
import Link from "next/link";
import StoreModifierSelectionPanel from "@/components/owner/stores/StoreModifierSelectionPanel";

interface Props {
  params: Promise<{ storeId: string }>;
}

export default async function StoreModifiersPage({ params }: Props) {
  const { storeId } = await params;
  const ctx = await requireOwnerStoreAccess(storeId);
  const tenantId = resolveActorTenantId(ctx, storeId);
  const selections = await listStoreModifierGroupSelections(storeId, tenantId);

  return (
    <div className="max-w-4xl mx-auto px-4 pb-10 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-base font-semibold text-gray-800">Modifier Groups</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Choose which modifier groups are active in this store and set their display order.
            The default order follows the catalog settings, but you can override it per store.
          </p>
        </div>
        <Link
          href="/owner/products/modifiers"
          className="px-3 py-1.5 text-xs border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Manage Modifier Groups →
        </Link>
      </div>

      {selections.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-sm text-gray-400">
          No modifier groups defined yet.{" "}
          <Link href="/owner/products/modifiers" className="text-brand-600 hover:underline">
            Create modifier groups in the product catalog →
          </Link>
        </div>
      ) : (
        <StoreModifierSelectionPanel storeId={storeId} initialSelections={selections} />
      )}
    </div>
  );
}

