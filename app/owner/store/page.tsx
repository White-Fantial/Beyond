import { requireOwnerAdminAccess } from "@/lib/owner/auth-guard";
import { getOwnerStoreInfo } from "@/services/owner/owner-store.service";
import StoreBasicInfoForm from "@/components/owner/settings/StoreBasicInfoForm";

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
          <section className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-base font-semibold text-gray-800 mb-4">Basic Info</h2>
            <StoreBasicInfoForm
              storeId={store.id}
              initial={{
                displayName: store.name,
                phone: store.phone,
                email: store.email,
                addressLine1: store.addressLine1,
                city: store.city,
                region: store.region,
                postalCode: store.postalCode,
                timezone: store.timezone,
              }}
            />
          </section>
        </div>
      )}
    </div>
  );
}
