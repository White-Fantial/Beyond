import { requireOwnerPortalAccess } from "@/lib/owner/auth-guard";
import { prisma } from "@/lib/prisma";
import OperationsSettingsForm from "@/components/owner/settings/OperationsSettingsForm";
import type { OwnerOperationSettings } from "@/types/owner";

export default async function OwnerOperationsPage() {
  const ctx = await requireOwnerPortalAccess();
  const tenantId = ctx.tenantMemberships[0]?.tenantId ?? "";

  const stores = tenantId
    ? await prisma.store.findMany({
        where: { tenantId, status: { not: "ARCHIVED" } },
        include: { storeOperationSettings: true },
        orderBy: { name: "asc" },
      })
    : [];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Operations Settings</h1>
        <p className="mt-1 text-sm text-gray-500">Manage operations per store.</p>
      </div>

      <div className="space-y-4">
        {stores.length === 0 ? (
          <p className="text-gray-400 text-sm">No stores found.</p>
        ) : (
          stores.map((store) => {
            const s = store.storeOperationSettings;
            const initial: OwnerOperationSettings = {
              id: s?.id ?? null,
              storeId: store.id,
              storeName: store.name,
              storeOpen: s?.storeOpen ?? true,
              holidayMode: s?.holidayMode ?? false,
              pickupIntervalMinutes: s?.pickupIntervalMinutes ?? 15,
              minPrepTimeMinutes: s?.minPrepTimeMinutes ?? 10,
              maxOrdersPerSlot: s?.maxOrdersPerSlot ?? 10,
              autoAcceptOrders: s?.autoAcceptOrders ?? false,
              autoPrintPos: s?.autoPrintPos ?? false,
              subscriptionEnabled: s?.subscriptionEnabled ?? false,
              onlineOrderEnabled: s?.onlineOrderEnabled ?? true,
            };
            return (
              <div key={store.id} className="bg-white rounded-lg border border-gray-200 p-5">
                <h2 className="text-sm font-semibold text-gray-800 mb-4">{store.name}</h2>
                <OperationsSettingsForm storeId={store.id} initial={initial} />
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
