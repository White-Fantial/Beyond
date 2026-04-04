import { requireOwnerAdminAccess } from "@/lib/owner/auth-guard";
import { getOwnerTenantSettings } from "@/services/owner/owner-settings.service";
import TenantSettingsForm from "@/components/owner/settings/TenantSettingsForm";

export default async function OwnerSettingsPage() {
  const ctx = await requireOwnerAdminAccess();
  const tenantId = ctx.tenantMemberships[0]?.tenantId ?? "";

  const settings = tenantId ? await getOwnerTenantSettings(tenantId) : null;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Organisation Settings</h1>
        <p className="mt-1 text-sm text-gray-500">Manage your organisation profile and defaults.</p>
      </div>

      {!settings ? (
        <p className="text-gray-500">Could not load organisation settings.</p>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 p-6 max-w-2xl">
          <TenantSettingsForm initial={settings} />
        </div>
      )}
    </div>
  );
}
