import { requireOwnerPortalAccess } from "@/lib/owner/auth-guard";
import { getCatalogSettingsForTenant } from "@/services/owner/owner-settings.service";
import CatalogSettingsForm from "@/components/owner/settings/CatalogSettingsForm";

export default async function OwnerCatalogPage() {
  const ctx = await requireOwnerPortalAccess();
  const tenantId = ctx.tenantMemberships[0]?.tenantId ?? "";

  const stores = tenantId ? await getCatalogSettingsForTenant(tenantId) : [];

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
          stores.map((s) => (
            <div key={s.storeId} className="bg-white rounded-lg border border-gray-200 p-5">
              <h2 className="text-sm font-semibold text-gray-800 mb-4">{s.storeName}</h2>
              <CatalogSettingsForm storeId={s.storeId} initial={s} />
            </div>
          ))
        )}
      </div>
    </div>
  );
}
