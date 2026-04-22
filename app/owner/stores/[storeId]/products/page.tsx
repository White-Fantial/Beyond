import { requireOwnerStoreAccess, resolveActorTenantId } from "@/services/owner/owner-authz.service";
import { listStoreProductSelections, listTenantProducts } from "@/services/owner/owner-tenant-products.service";
import Link from "next/link";
import StoreProductCatalogPanel from "@/components/owner/products/StoreProductCatalogPanel";

interface Props {
  params: Promise<{ storeId: string }>;
  searchParams: Promise<{ view?: string | string[] }>;
}

function firstParam(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

export default async function StoreProductsPage({ params, searchParams }: Props) {
  const { storeId } = await params;
  const query = await searchParams;
  const view = firstParam(query.view) ?? "store";
  const ctx = await requireOwnerStoreAccess(storeId);
  const tenantId = resolveActorTenantId(ctx, storeId);

  const [selections, tenantProducts] = await Promise.all([
    listStoreProductSelections(storeId),
    listTenantProducts(tenantId),
  ]);

  const selectedProductIds = new Set(selections.map((s) => s.tenantProductId));
  const unselectedTenantProducts = tenantProducts.filter((p) => !selectedProductIds.has(p.id) && p.isActive);

  return (
    <div className="max-w-5xl mx-auto px-4 pb-10 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-base font-semibold text-gray-800">Products</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Manage products for this store. Products are selected from the shared product catalog.
          </p>
        </div>
        <Link
          href="/owner/products"
          className="px-3 py-1.5 text-xs border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Manage Product Catalog →
        </Link>
      </div>

      {/* View tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        <a
          href={`/owner/stores/${storeId}/products`}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
            view === "store"
              ? "border-brand-500 text-brand-700"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          Store Products
          {selections.length > 0 && (
            <span className="ml-1.5 text-xs bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-full">
              {selections.length}
            </span>
          )}
        </a>
        <a
          href={`/owner/stores/${storeId}/products?view=add`}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
            view === "add"
              ? "border-brand-500 text-brand-700"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          + Add from Catalog
          {unselectedTenantProducts.length > 0 && (
            <span className="ml-1.5 text-xs bg-green-100 text-green-600 px-1.5 py-0.5 rounded-full">
              {unselectedTenantProducts.length} available
            </span>
          )}
        </a>
      </div>

      {/* Store Products tab (previously "Selected from Catalog") */}
      {view === "store" && (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          {selections.length === 0 ? (
            <div className="p-10 text-center">
              <p className="text-gray-400 text-sm">No products selected for this store yet.</p>
              <a
                href={`/owner/stores/${storeId}/products?view=add`}
                className="mt-3 inline-block text-sm text-brand-600 hover:underline"
              >
                Browse catalog →
              </a>
            </div>
          ) : (
            <StoreProductCatalogPanel storeId={storeId} selections={selections} />
          )}
        </div>
      )}

      {/* Add from Catalog tab */}
      {view === "add" && (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          {unselectedTenantProducts.length === 0 ? (
            <div className="p-10 text-center">
              <p className="text-gray-400 text-sm">
                {tenantProducts.length === 0
                  ? "No products in the shared catalog yet."
                  : "All catalog products are already selected for this store."}
              </p>
              <Link
                href="/owner/products"
                className="mt-3 inline-block text-sm text-brand-600 hover:underline"
              >
                Manage product catalog →
              </Link>
            </div>
          ) : (
            <StoreProductCatalogPanel
              storeId={storeId}
              selections={[]}
              availableProducts={unselectedTenantProducts}
              mode="add"
            />
          )}
        </div>
      )}
    </div>
  );
}

