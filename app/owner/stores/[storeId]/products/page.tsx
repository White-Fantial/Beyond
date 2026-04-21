import { requireOwnerStoreAccess, resolveActorTenantId } from "@/services/owner/owner-authz.service";
import { listOwnerProducts } from "@/services/owner/owner-catalog.service";
import { listStoreProductSelections } from "@/services/owner/owner-tenant-products.service";
import { listTenantProducts } from "@/services/owner/owner-tenant-products.service";
import Link from "next/link";
import StoreProductCatalogPanel from "@/components/owner/products/StoreProductCatalogPanel";

interface Props {
  params: Promise<{ storeId: string }>;
  searchParams: Promise<{ search?: string | string[]; filter?: string | string[]; view?: string | string[] }>;
}

function firstParam(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

// Phase 1: originType replaces sourceType as the provenance badge.
// These show where a product ORIGINALLY came from — they are informational only.
const ORIGIN_BADGE: Record<string, { label: string; className: string }> = {
  BEYOND_CREATED: { label: "Beyond", className: "bg-green-100 text-green-700" },
  IMPORTED_FROM_POS: { label: "Imported (POS)", className: "bg-blue-100 text-blue-700" },
  IMPORTED_FROM_DELIVERY: { label: "Imported (Delivery)", className: "bg-orange-100 text-orange-700" },
  IMPORTED_FROM_OTHER: { label: "Imported", className: "bg-gray-100 text-gray-600" },
};
// @deprecated: fallback for old sourceType values during migration
const SOURCE_BADGE_COMPAT: Record<string, { label: string; className: string }> = {
  POS: ORIGIN_BADGE.IMPORTED_FROM_POS,
  LOCAL: ORIGIN_BADGE.BEYOND_CREATED,
  MERGED: { label: "Merged", className: "bg-purple-100 text-purple-700" },
  DELIVERY: ORIGIN_BADGE.IMPORTED_FROM_DELIVERY,
};

function formatPrice(amount: number, currency: string) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount / 100);
}

export default async function StoreProductsPage({ params, searchParams }: Props) {
  const { storeId } = await params;
  const query = await searchParams;
  const filter = firstParam(query.filter);
  const search = firstParam(query.search);
  const view = firstParam(query.view) ?? "store";
  const ctx = await requireOwnerStoreAccess(storeId);
  const tenantId = resolveActorTenantId(ctx, storeId);

  const [products, selections, tenantProducts] = await Promise.all([
    listOwnerProducts(storeId, {
      onlySoldOut: filter === "sold_out",
      onlyFeatured: filter === "featured",
      onlyVisible: filter === "visible",
      search,
    }),
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
            Manage products for this store. Click a product to view recipes and cost info.
          </p>
        </div>
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
          {products.length > 0 && (
            <span className="ml-1.5 text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full">
              {products.length}
            </span>
          )}
        </a>
        <a
          href={`/owner/stores/${storeId}/products?view=catalog`}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
            view === "catalog"
              ? "border-brand-500 text-brand-700"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          Selected from Catalog
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

      {/* Store Products tab */}
      {view === "store" && (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-200 flex gap-2 text-xs">
            <a href={`/owner/stores/${storeId}/products`} className="px-2 py-1 rounded border border-gray-200 text-gray-600 hover:bg-gray-50">All</a>
            <a href={`/owner/stores/${storeId}/products?filter=sold_out`} className="px-2 py-1 rounded border border-gray-200 text-gray-600 hover:bg-gray-50">Sold Out only</a>
            <a href={`/owner/stores/${storeId}/products?filter=featured`} className="px-2 py-1 rounded border border-gray-200 text-gray-600 hover:bg-gray-50">Featured only</a>
          </div>
          {products.length === 0 ? (
            <div className="p-8 text-center text-sm text-gray-400">
              No products found. Add products or import via Catalog Sync.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">Product Name</th>
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">Online Name</th>
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">Origin</th>
                    <th className="text-right px-4 py-2.5 text-xs font-medium text-gray-500">Price</th>
                    <th className="text-center px-4 py-2.5 text-xs font-medium text-gray-500">Recipe</th>
                    <th className="text-center px-4 py-2.5 text-xs font-medium text-gray-500">Visible</th>
                    <th className="text-center px-4 py-2.5 text-xs font-medium text-gray-500">Featured</th>
                    <th className="text-center px-4 py-2.5 text-xs font-medium text-gray-500">Sold Out</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {products.map((p) => {
                    const originBadge = ORIGIN_BADGE[p.originType] ?? SOURCE_BADGE_COMPAT[p.sourceType] ?? { label: p.originType, className: "bg-gray-100 text-gray-600" };
                    return (
                      <tr key={p.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <Link
                            href={`/owner/stores/${storeId}/products/${p.id}`}
                            className="font-medium text-brand-700 hover:text-brand-900 hover:underline"
                          >
                            {p.name}
                          </Link>
                          {p.shortDescription && (
                            <div className="text-xs text-gray-400 mt-0.5 line-clamp-1">{p.shortDescription}</div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-gray-600">{p.onlineName ?? <span className="text-gray-300">-</span>}</td>
                        <td className="px-4 py-3">
                          <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${originBadge.className}`}>
                            {originBadge.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right text-gray-500">
                          {formatPrice(p.basePriceAmount, p.currency)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {p.recipeCount > 0 ? (
                            <Link
                              href={`/owner/stores/${storeId}/products/${p.id}`}
                              className="text-xs font-medium px-1.5 py-0.5 rounded bg-green-100 text-green-700 hover:bg-green-200"
                            >
                              있음 ({p.recipeCount})
                            </Link>
                          ) : (
                            <Link
                              href={`/owner/stores/${storeId}/products/${p.id}`}
                              className="text-xs px-1.5 py-0.5 rounded bg-amber-50 text-amber-600 hover:bg-amber-100"
                            >
                              없음
                            </Link>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`text-xs px-1.5 py-0.5 rounded ${p.isVisibleOnOnlineOrder ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-400"}`}>
                            {p.isVisibleOnOnlineOrder ? "ON" : "OFF"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`text-xs px-1.5 py-0.5 rounded ${p.isFeatured ? "bg-yellow-100 text-yellow-700" : "bg-gray-100 text-gray-400"}`}>
                            {p.isFeatured ? "⭐" : "-"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`text-xs px-1.5 py-0.5 rounded ${p.isSoldOut ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-400"}`}>
                            {p.isSoldOut ? "Sold Out" : "-"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Selected from Catalog tab */}
      {view === "catalog" && (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          {selections.length === 0 ? (
            <div className="p-10 text-center">
              <p className="text-gray-400 text-sm">No products selected from the shared catalog yet.</p>
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

