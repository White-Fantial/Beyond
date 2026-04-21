import { requireAuth } from "@/lib/auth/permissions";
import { listAvailableSuppliers } from "@/services/owner/owner-suppliers.service";
import { listCredentials } from "@/services/owner/owner-supplier-credentials.service";
import SupplierListClient from "@/components/owner/suppliers/SupplierListClient";
import Link from "next/link";

export default async function OwnerSuppliersPage() {
  const ctx = await requireAuth();
  const tenantId = ctx.tenantMemberships[0]?.tenantId ?? "";
  const userId = ctx.userId;

  const [result, credentials] = await Promise.all([
    listAvailableSuppliers(tenantId, { pageSize: 200 }),
    listCredentials(tenantId, userId),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Suppliers</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Browse platform suppliers and manage your login credentials. Can&apos;t find your
            supplier?{" "}
            <Link href="/owner/supplier-requests" className="text-brand-600 hover:underline">
              Request it here
            </Link>
            .
          </p>
        </div>
        <Link
          href="/owner/supplier-requests"
          className="px-4 py-2 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700"
        >
          + Request Supplier
        </Link>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-sm text-blue-800 space-y-1">
        <p className="font-medium">How credentials work</p>
        <ul className="list-disc list-inside space-y-0.5 text-xs text-blue-700">
          <li>Add your supplier login — your password is encrypted and never shared.</li>
          <li>Beyond uses these to scrape your account-specific pricing automatically.</li>
          <li>Click <strong>Add Credentials</strong> on any supplier row to get started.</li>
        </ul>
      </div>

      <SupplierListClient suppliers={result.items} credentials={credentials} />
    </div>
  );
}
