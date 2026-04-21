import { requireOwnerPortalAccess } from "@/lib/owner/auth-guard";
import { listTenantProducts, listTenantProductCategories } from "@/services/owner/owner-tenant-products.service";
import Link from "next/link";
import ProductCategoryManager from "@/components/owner/products/ProductCategoryManager";

function formatPrice(amount: number, currency: string) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount / 100000);
}

export default async function OwnerProductsPage() {
  const ctx = await requireOwnerPortalAccess();
  const tenantId = ctx.tenantMemberships[0]?.tenantId ?? "";
  const [products, categories] = await Promise.all([
    tenantId ? listTenantProducts(tenantId) : [],
    tenantId ? listTenantProductCategories(tenantId) : [],
  ]);

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Product Catalog</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Manage your shared product catalog. Each store can select which products to sell.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <ProductCategoryManager initialCategories={categories} />
          <Link
            href="/owner/products/new"
            className="px-4 py-2 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 transition-colors"
          >
            + New Product
          </Link>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {products.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-gray-400 text-sm">No products in the catalog yet.</p>
            <p className="text-gray-400 text-xs mt-1">
              Add products here, then assign them to individual stores.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">Name</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">Category</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">Description</th>
                  <th className="text-right px-4 py-2.5 text-xs font-medium text-gray-500">Base Price</th>
                  <th className="text-center px-4 py-2.5 text-xs font-medium text-gray-500">Stores</th>
                  <th className="text-center px-4 py-2.5 text-xs font-medium text-gray-500">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {products.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <Link
                        href={`/owner/products/${p.id}`}
                        className="font-medium text-brand-700 hover:text-brand-900 hover:underline"
                      >
                        {p.name}
                      </Link>
                      {p.shortDescription && (
                        <div className="text-xs text-gray-400 mt-0.5 line-clamp-1">
                          {p.shortDescription}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {p.categoryName ? (
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">
                          {p.categoryName}
                        </span>
                      ) : (
                        <span className="text-gray-300 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs line-clamp-2 max-w-xs">
                      {p.description ?? <span className="text-gray-300">-</span>}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700 font-medium">
                      {formatPrice(p.basePriceAmount, p.currency)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${p.selectionCount > 0 ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-400"}`}>
                        {p.selectionCount} {p.selectionCount === 1 ? "store" : "stores"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${p.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-400"}`}>
                        {p.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
