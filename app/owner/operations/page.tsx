import { requireOwnerPortalAccess } from "@/lib/owner/auth-guard";
import { prisma } from "@/lib/prisma";

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
        <p className="mt-1 text-sm text-gray-500">매장별 운영 설정을 관리합니다.</p>
      </div>

      <div className="space-y-4">
        {stores.length === 0 ? (
          <p className="text-gray-400 text-sm">매장이 없습니다.</p>
        ) : (
          stores.map((store) => {
            const s = store.storeOperationSettings;
            return (
              <div key={store.id} className="bg-white rounded-lg border border-gray-200 p-5">
                <h2 className="text-sm font-semibold text-gray-800 mb-4">{store.name}</h2>
                <dl className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  <ToggleField label="Store Open" value={s?.storeOpen ?? true} />
                  <ToggleField label="Holiday Mode" value={s?.holidayMode ?? false} />
                  <ToggleField label="Auto Accept Orders" value={s?.autoAcceptOrders ?? false} />
                  <ToggleField label="Auto Print POS" value={s?.autoPrintPos ?? false} />
                  <ToggleField label="Subscription Enabled" value={s?.subscriptionEnabled ?? false} />
                  <ToggleField label="Online Order Enabled" value={s?.onlineOrderEnabled ?? true} />
                  <NumberField label="Pickup Interval" value={s?.pickupIntervalMinutes ?? 15} unit="분" />
                  <NumberField label="Min Prep Time" value={s?.minPrepTimeMinutes ?? 10} unit="분" />
                  <NumberField label="Max Orders / Slot" value={s?.maxOrdersPerSlot ?? 10} unit="건" />
                </dl>
              </div>
            );
          })
        )}
      </div>

      <p className="mt-4 text-xs text-gray-400">
        * 운영 설정 수정 기능은 다음 업데이트에서 제공됩니다.
      </p>
    </div>
  );
}

function ToggleField({ label, value }: { label: string; value: boolean }) {
  return (
    <div>
      <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</dt>
      <dd className="mt-1">
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
            value ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
          }`}
        >
          {value ? "On" : "Off"}
        </span>
      </dd>
    </div>
  );
}

function NumberField({ label, value, unit }: { label: string; value: number; unit: string }) {
  return (
    <div>
      <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</dt>
      <dd className="mt-1 text-sm text-gray-900">
        {value}
        <span className="text-gray-400 ml-0.5">{unit}</span>
      </dd>
    </div>
  );
}
