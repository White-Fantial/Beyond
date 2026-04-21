import { requireOwnerPortalAccess } from "@/lib/owner/auth-guard";
import { getTenantProduct } from "@/services/owner/owner-tenant-products.service";
import { notFound } from "next/navigation";
import Link from "next/link";

interface Props {
  params: Promise<{ productId: string }>;
}

function formatPrice(amount: number, currency: string) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount / 100);
}

export default async function TenantProductDetailPage({ params }: Props) {
  const { productId } = await params;
  const ctx = await requireOwnerPortalAccess();
  const tenantId = ctx.tenantMemberships[0]?.tenantId ?? "";

  const product = await getTenantProduct(tenantId, productId);
  if (!product) notFound();

  return (
    <div className="max-w-3xl mx-auto py-8 px-4 space-y-6">
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Link href="/owner/products" className="hover:text-gray-700">
          ← Product Catalog
        </Link>
        <span className="text-gray-300">/</span>
        <span className="text-gray-800 font-medium">{product.name}</span>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900">{product.name}</h1>
            {product.shortDescription && (
              <p className="text-sm text-gray-500 mt-1">{product.shortDescription}</p>
            )}
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-gray-900">
              {formatPrice(product.basePriceAmount, product.currency)}
            </div>
            <span
              className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                product.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-400"
              }`}
            >
              {product.isActive ? "Active" : "Inactive"}
            </span>
          </div>
        </div>

        {product.description && (
          <p className="text-sm text-gray-600 mb-4">{product.description}</p>
        )}

        <div className="flex items-center gap-2 text-xs text-gray-500 pt-4 border-t border-gray-100">
          <span className="font-medium">
            {product.selectionCount} {product.selectionCount === 1 ? "store" : "stores"} selling this product
          </span>
        </div>

        {product.internalNote && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
              Internal Note
            </div>
            <p className="text-sm text-gray-600">{product.internalNote}</p>
          </div>
        )}
      </div>

      <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 text-sm text-blue-700">
        <strong>Store assignment:</strong> To assign this product to a specific store, go to that
        store&apos;s{" "}
        <strong>Products</strong> page and use the <strong>Add from Catalog</strong> button.
      </div>
    </div>
  );
}
