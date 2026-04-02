import { requireOwnerStoreAccess } from "@/services/owner/owner-authz.service";
import { listOwnerProducts } from "@/services/owner/owner-catalog.service";

interface Props {
  params: { storeId: string };
  searchParams: { search?: string; filter?: string };
}

const SOURCE_BADGE: Record<string, { label: string; className: string }> = {
  POS: { label: "POS", className: "bg-blue-100 text-blue-700" },
  LOCAL: { label: "LOCAL", className: "bg-green-100 text-green-700" },
  MERGED: { label: "MERGED", className: "bg-purple-100 text-purple-700" },
  DELIVERY: { label: "DELIVERY", className: "bg-orange-100 text-orange-700" },
};

function formatPrice(amount: number, currency: string) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount / 100);
}

export default async function StoreProductsPage({ params, searchParams }: Props) {
  const { storeId } = params;
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
            * Only online/subscription visibility settings can be edited. POS-based data (name, price) is read-only.
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
            No products found. POS 또는 Catalog Sync 후 확인하세요.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">Product Name</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">Online Name</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">Source</th>
                  <th className="text-right px-4 py-2.5 text-xs font-medium text-gray-500">Price(읽기전용)</th>
                  <th className="text-center px-4 py-2.5 text-xs font-medium text-gray-500">Visible</th>
                  <th className="text-center px-4 py-2.5 text-xs font-medium text-gray-500">Subscription</th>
                  <th className="text-center px-4 py-2.5 text-xs font-medium text-gray-500">Featured</th>
                  <th className="text-center px-4 py-2.5 text-xs font-medium text-gray-500">Sold Out</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {products.map((p) => {
                  const srcBadge = SOURCE_BADGE[p.sourceType] ?? { label: p.sourceType, className: "bg-gray-100 text-gray-600" };
                  const isPosLocked = p.sourceType === "POS" || p.sourceType === "MERGED";
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
                        <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${srcBadge.className}`}>
                          {srcBadge.label}
                        </span>
                        {isPosLocked && (
                          <div className="text-xs text-gray-400 mt-0.5">🔒 Read-only</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-500">
                        {formatPrice(p.basePriceAmount, p.currency)}
                        {isPosLocked && <div className="text-xs text-gray-300">POS 기준</div>}
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
