import { requireAuth } from "@/lib/auth/permissions";
import { listCredentials } from "@/services/owner/owner-supplier-credentials.service";
import { listSuppliers } from "@/services/owner/owner-suppliers.service";
import AddCredentialForm from "@/components/owner/supplier-credentials/AddCredentialForm";
import CredentialList from "@/components/owner/supplier-credentials/CredentialList";

export default async function SupplierCredentialsPage() {
  const ctx = await requireAuth();
  const tenantId = ctx.tenantMemberships[0]?.tenantId ?? "";
  const userId = ctx.userId;

  const [credentials, suppliersResult] = await Promise.all([
    listCredentials(tenantId, userId),
    listSuppliers(tenantId, { pageSize: 100 }),
  ]);

  const suppliers = suppliersResult.items.map((s) => ({ id: s.id, name: s.name }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Supplier Accounts</h1>
        <p className="mt-1 text-sm text-gray-500">
          Register your personal login credentials for each supplier. Beyond uses these to
          scrape your account-specific pricing, which is then combined across all users to
          set a conservative base price for cost calculations.
        </p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-sm text-blue-800 space-y-1">
        <p className="font-medium">How it works</p>
        <ul className="list-disc list-inside space-y-0.5 text-xs text-blue-700">
          <li>Add your supplier login — your password is encrypted and never shared.</li>
          <li>Beyond scrapes only the products used in your recipes using your credentials.</li>
          <li>The highest price observed across all users becomes the <strong>base price</strong>.</li>
          <li>Users without credentials use this base price for cost calculations.</li>
        </ul>
      </div>

      <AddCredentialForm suppliers={suppliers} />
      <CredentialList credentials={credentials} />
    </div>
  );
}
