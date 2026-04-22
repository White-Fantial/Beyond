import { requirePlatformAdmin } from "@/lib/admin/auth-guard";
import { getPlatformSupplierDetail, getPlatformSupplierProduct } from "@/services/admin/admin-suppliers.service";
import Link from "next/link";
import { notFound } from "next/navigation";
import { INGREDIENT_UNIT_LABELS } from "@/types/owner-ingredients";

interface Props {
  params: Promise<{ supplierId: string; productId: string }>;
}

export default async function AdminSupplierProductDetailPage({ params }: Props) {
  await requirePlatformAdmin();
  const { supplierId, productId } = await params;

  try {
    const [supplier, product] = await Promise.all([
      getPlatformSupplierDetail(supplierId),
      getPlatformSupplierProduct(supplierId, productId),
    ]);

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
          <Link
            href={`/admin/suppliers/${supplierId}`}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            {supplier.name}
          </Link>
          <span className="text-gray-300">/</span>
          <h1 className="text-xl font-bold text-gray-900">{product.name}</h1>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-start justify-between gap-4 mb-4">
            <h2 className="text-lg font-semibold text-gray-900">{product.name}</h2>
            <Link
              href={`/admin/suppliers/${supplierId}/products/${productId}/edit`}
              className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-700 shrink-0"
            >
              Edit
            </Link>
          </div>

          <dl className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div>
              <dt className="text-xs font-medium text-gray-500">Reference Price</dt>
              <dd className="mt-0.5 text-sm text-gray-900 font-semibold">
                ${(product.referencePrice / 100000).toFixed(2)}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-gray-500">Unit</dt>
              <dd className="mt-0.5 text-sm text-gray-900">
                {INGREDIENT_UNIT_LABELS[product.unit] ?? product.unit} ({product.unit})
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-gray-500">Supplier</dt>
              <dd className="mt-0.5 text-sm text-gray-900">{supplier.name}</dd>
            </div>
            {product.externalUrl && (
              <div className="col-span-2 sm:col-span-3">
                <dt className="text-xs font-medium text-gray-500">External URL</dt>
                <dd className="mt-0.5 text-sm">
                  <a
                    href={product.externalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    {product.externalUrl}
                  </a>
                </dd>
              </div>
            )}
            {product.lastScrapedAt && (
              <div>
                <dt className="text-xs font-medium text-gray-500">Last Scraped</dt>
                <dd className="mt-0.5 text-sm text-gray-900">
                  {new Date(product.lastScrapedAt).toLocaleDateString()}
                </dd>
              </div>
            )}
          </dl>
        </div>
      </div>
    );
  } catch {
    notFound();
  }
}
