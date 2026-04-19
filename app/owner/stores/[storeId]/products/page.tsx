import { requireOwnerStoreAccess } from "@/services/owner/owner-authz.service";
import { listOwnerProducts } from "@/services/owner/owner-catalog.service";

interface Props {
  params: Promise<{ storeId: string }>;
  searchParams: { search?: string; filter?: string };
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
  await requireOwnerStoreAccess(storeId);

  const products = await listOwnerProducts(storeId, {
    onlySoldOut: searchParams.filter === "sold_out",
    onlyFeatured: searchParams.filter === "featured",
    onlyVisible: searchParams.filter === "visible",
    search: searchParams.search,
  });

  return (
    <div className="max-w-5xl mx-auto px-4 pb-10 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-base font-semibold text-gray-800">Products</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Menu data is managed in Beyond. All fields can be edited here.
          </p>
        </div>
        <div className="flex gap-2 text-xs">
          <a href={`/owner/stores/${storeId}/products`} className="px-2 py-1 rounded border border-gray-200 text-gray-600 hover:bg-gray-50">All</a>
          <a href={`/owner/stores/${storeId}/products?filter=sold_out`} className="px-2 py-1 rounded border border-gray-200 text-gray-600 hover:bg-gray-50">Sold Out only</a>
          <a href={`/owner/stores/${storeId}/products?filter=featured`} className="px-2 py-1 rounded border border-gray-200 text-gray-600 hover:bg-gray-50">Featured only</a>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
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
                  <th className="text-center px-4 py-2.5 text-xs font-medium text-gray-500">Visible</th>
                  <th className="text-center px-4 py-2.5 text-xs font-medium text-gray-500">Subscription</th>
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
                        <div className="font-medium text-gray-900">{p.name}</div>
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
                        <span className={`text-xs px-1.5 py-0.5 rounded ${p.isVisibleOnOnlineOrder ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-400"}`}>
                          {p.isVisibleOnOnlineOrder ? "ON" : "OFF"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-xs px-1.5 py-0.5 rounded ${p.isVisibleOnSubscription ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-400"}`}>
                          {p.isVisibleOnSubscription ? "ON" : "OFF"}
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
      <p className="text-xs text-gray-400">
        상품 Edit API: PATCH /api/owner/stores/{storeId}/products/[productId]
      </p>
    </div>
  );
}
