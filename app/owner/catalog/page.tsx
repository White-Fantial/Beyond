import { requireOwnerPortalAccess } from "@/lib/owner/auth-guard";
import { prisma } from "@/lib/prisma";

const SOURCE_TYPE_LABELS: Record<string, string> = {
  POS: "POS",
  LOCAL: "Local",
  MERGED: "Merged",
  DELIVERY: "Delivery",
  IMPORTED: "Imported",
};

export default async function OwnerCatalogPage() {
  const ctx = await requireOwnerPortalAccess();

  const tenantId = ctx.tenantMemberships[0]?.tenantId ?? "";

  const stores = tenantId
    ? await prisma.store.findMany({
        where: { tenantId, status: { not: "ARCHIVED" } },
        include: { catalogSettings: true },
        orderBy: { name: "asc" },
      })
    : [];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Catalog Source Settings</h1>
        <p className="mt-1 text-sm text-gray-500">Catalog source and sync settings per store.</p>
      </div>

      <div className="space-y-4">
        {stores.length === 0 ? (
          <p className="text-gray-400 text-sm">No stores found.</p>
        ) : (
          stores.map((store) => {
            const settings = store.catalogSettings;
            return (
              <div key={store.id} className="bg-white rounded-lg border border-gray-200 p-5">
                <h2 className="text-sm font-semibold text-gray-800 mb-4">{store.name}</h2>
                <dl className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <SettingField
                    label="Source Type"
                    value={SOURCE_TYPE_LABELS[settings?.sourceType ?? "LOCAL"] ?? "LOCAL"}
                  />
                  <SettingField
                    label="Auto Sync"
                    value={settings?.autoSync ? "On" : "Off"}
                  />
                  <SettingField
                    label="Sync Interval"
                    value={`${settings?.syncIntervalMinutes ?? 60}분`}
                  />
                  <SettingField
                    label="Source Connection"
                    value={settings?.sourceConnectionId ? "Settings됨" : "—"}
                  />
                </dl>
              </div>
            );
          })
        )}
      </div>

      <p className="mt-4 text-xs text-gray-400">
        * Catalog settings editing will be available in a future update.
      </p>
    </div>
  );
}

function SettingField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</dt>
      <dd className="mt-1 text-sm text-gray-900">{value}</dd>
    </div>
  );
}
