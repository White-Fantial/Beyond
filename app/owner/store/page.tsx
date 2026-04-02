import { requireOwnerAdminAccess } from "@/lib/owner/auth-guard";
import { getOwnerStoreInfo } from "@/services/owner/owner-store.service";

export default async function OwnerStorePage() {
  const ctx = await requireOwnerAdminAccess();

  const tenantId = ctx.tenantMemberships[0]?.tenantId ?? "";
  const store = tenantId ? await getOwnerStoreInfo(tenantId) : null;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Store Settings</h1>
        <p className="mt-1 text-sm text-gray-500">매장 기본 정보 및 운영 설정을 관리합니다.</p>
      </div>

      {!store ? (
        <p className="text-gray-500">매장 정보를 불러올 수 없습니다.</p>
      ) : (
        <div className="space-y-6 max-w-2xl">
          {/* Basic Info */}
          <section className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-base font-semibold text-gray-800 mb-4">기본 정보</h2>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
              <FieldRow label="Store Name" value={store.name} />
              <FieldRow label="Email" value={store.email ?? "—"} />
              <FieldRow label="Phone" value={store.phone ?? "—"} />
              <FieldRow label="Address" value={store.addressLine1 ?? "—"} />
              <FieldRow label="Timezone" value={store.timezone} />
              <FieldRow label="Currency" value={store.currency} />
            </dl>
          </section>

          {/* Operational Settings */}
          <section className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-base font-semibold text-gray-800 mb-4">운영 설정</h2>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
              <FieldRow label="Tax Rate" value={`${(store.taxRate * 100).toFixed(1)}%`} />
              <FieldRow label="Service Fee" value={`${(store.serviceFeeRate * 100).toFixed(1)}%`} />
              <FieldRow
                label="Pickup Interval"
                value={`${store.pickupIntervalMinutes}분`}
              />
              <FieldRow
                label="Default Prep Time"
                value={`${store.defaultPrepTimeMinutes}분`}
              />
            </dl>
          </section>

          <p className="text-xs text-gray-400">
            * 설정 수정 기능은 다음 업데이트에서 제공됩니다.
          </p>
        </div>
      )}
    </div>
  );
}

function FieldRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</dt>
      <dd className="mt-1 text-sm text-gray-900">{value}</dd>
    </div>
  );
}
