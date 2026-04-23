import { requirePlatformAdmin } from "@/lib/admin/auth-guard";
import { getPlatformSupplierDetail } from "@/services/admin/admin-suppliers.service";
import AdminSupplierDetailPanel from "@/components/admin/AdminSupplierDetailPanel";
import Link from "next/link";
import { notFound } from "next/navigation";

interface Props {
  params: Promise<{ supplierId: string }>;
}

export default async function AdminSupplierDetailPage({ params }: Props) {
  await requirePlatformAdmin();
  const { supplierId } = await params;

  try {
    const supplier = await getPlatformSupplierDetail(supplierId);
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3 flex-wrap">
          <Link
            href="/admin/suppliers"
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            ← Platform Suppliers
          </Link>
          <span className="text-gray-300">/</span>
          <h1 className="text-xl font-bold text-gray-900">{supplier.name}</h1>
        </div>

        {/* Supplier info */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-start justify-between gap-4 mb-4">
            <h2 className="text-lg font-semibold text-gray-900">{supplier.name}</h2>
            <Link
              href={`/admin/suppliers/${supplierId}/edit`}
              className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-700 shrink-0"
            >
              Edit
            </Link>
          </div>
          <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {supplier.websiteUrl && (
              <div>
                <dt className="text-xs font-medium text-gray-500">Website</dt>
                <dd className="mt-0.5 text-sm text-gray-900">
                  <a
                    href={supplier.websiteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    {supplier.websiteUrl}
                  </a>
                </dd>
              </div>
            )}
            {supplier.contactEmail && (
              <div>
                <dt className="text-xs font-medium text-gray-500">Contact Email</dt>
                <dd className="mt-0.5 text-sm text-gray-900">{supplier.contactEmail}</dd>
              </div>
            )}
            {supplier.contactPhone && (
              <div>
                <dt className="text-xs font-medium text-gray-500">Contact Phone</dt>
                <dd className="mt-0.5 text-sm text-gray-900">{supplier.contactPhone}</dd>
              </div>
            )}
            {supplier.notes && (
              <div className="sm:col-span-2 lg:col-span-3">
                <dt className="text-xs font-medium text-gray-500">Notes</dt>
                <dd className="mt-0.5 text-sm text-gray-900">{supplier.notes}</dd>
              </div>
            )}
            <div>
              <dt className="text-xs font-medium text-gray-500">Scraper Adapter</dt>
              <dd className="mt-0.5">
                {supplier.adapterType ? (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                    {supplier.adapterType}
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-500">
                    Not configured (manual only)
                  </span>
                )}
              </dd>
            </div>
          </dl>
        </div>

        {/* Products management */}
        <AdminSupplierDetailPanel supplier={supplier} />
      </div>
    );
  } catch (err) {
    if (err instanceof Error && err.message.includes("not found")) notFound();
    throw err;
  }
}
