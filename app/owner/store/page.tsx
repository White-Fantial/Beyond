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
        <p className="mt-1 text-sm text-gray-500">Manage store basic info and operations.</p>
      </div>

      {!store ? (
        <p className="text-gray-500">Could not load store information.</p>
      ) : (
        <div className="space-y-6 max-w-2xl">
          {/* Basic Info */}
          <section className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-base font-semibold text-gray-800 mb-4">Basic Info</h2>
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
            <h2 className="text-base font-semibold text-gray-800 mb-4">Operations</h2>
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
            * Settings editing will be available in a future update.
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
