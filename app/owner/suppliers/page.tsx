import { requireAuth } from "@/lib/auth/permissions";
import { listAvailableSuppliers } from "@/services/owner/owner-suppliers.service";
import Link from "next/link";

export default async function OwnerSuppliersPage() {
  const ctx = await requireAuth();
  const tenantId = ctx.tenantMemberships[0]?.tenantId ?? "";

  const result = await listAvailableSuppliers(tenantId);

  const platformSuppliers = result.items.filter((s) => s.scope === "PLATFORM");
  const storeSuppliers = result.items.filter((s) => s.scope === "STORE");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Suppliers</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Browse platform suppliers and manage your credentials. Can&apos;t find your
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

      {platformSuppliers.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Platform Suppliers</h2>
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-500 bg-gray-50 border-b border-gray-100">
                  <th className="px-5 py-3 text-left font-medium">Supplier</th>
                  <th className="px-5 py-3 text-left font-medium">Contact</th>
                  <th className="px-5 py-3 text-right font-medium">Products</th>
                  <th className="px-5 py-3 text-right font-medium">Credentials</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {platformSuppliers.map((supplier) => (
                  <tr key={supplier.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3">
                      <div className="font-medium text-gray-900">{supplier.name}</div>
                      {supplier.websiteUrl && (
                        <a
                          href={supplier.websiteUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-brand-600 hover:underline"
                        >
                          {supplier.websiteUrl}
                        </a>
                      )}
                    </td>
                    <td className="px-5 py-3 text-gray-600">
                      {supplier.contactEmail ?? supplier.contactPhone ?? "—"}
                    </td>
                    <td className="px-5 py-3 text-right text-gray-700">
                      {supplier.productCount}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <Link
                        href="/owner/supplier-credentials"
                        className="text-brand-600 hover:text-brand-800 text-xs font-medium"
                      >
                        Manage Credentials
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {storeSuppliers.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Your Suppliers</h2>
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-500 bg-gray-50 border-b border-gray-100">
                  <th className="px-5 py-3 text-left font-medium">Supplier</th>
                  <th className="px-5 py-3 text-left font-medium">Contact</th>
                  <th className="px-5 py-3 text-right font-medium">Products</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {storeSuppliers.map((supplier) => (
                  <tr key={supplier.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3">
                      <div className="font-medium text-gray-900">{supplier.name}</div>
                      {supplier.websiteUrl && (
                        <a
                          href={supplier.websiteUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-brand-600 hover:underline"
                        >
                          {supplier.websiteUrl}
                        </a>
                      )}
                    </td>
                    <td className="px-5 py-3 text-gray-600">
                      {supplier.contactEmail ?? supplier.contactPhone ?? "—"}
                    </td>
                    <td className="px-5 py-3 text-right text-gray-700">
                      {supplier.productCount}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <Link
                        href={`/owner/suppliers/${supplier.id}`}
                        className="text-brand-600 hover:text-brand-800 text-xs font-medium"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {result.total === 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-sm text-gray-500">
          <p className="text-2xl mb-2">🚚</p>
          <p>No suppliers available yet.</p>
          <p className="mt-1">
            <Link href="/owner/supplier-requests" className="text-brand-600 hover:underline">
              Request a supplier
            </Link>{" "}
            to have it added to the platform.
          </p>
        </div>
      )}
    </div>
  );
}
