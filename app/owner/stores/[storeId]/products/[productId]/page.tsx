import { requireOwnerStoreAccess } from "@/services/owner/owner-authz.service";
import { getOwnerProduct } from "@/services/owner/owner-catalog.service";
import { getProductRecipes } from "@/services/owner/owner-recipes.service";
import ProductRecipePanel from "@/components/owner/products/ProductRecipePanel";
import { notFound } from "next/navigation";
import Link from "next/link";

interface Props {
  params: Promise<{ storeId: string; productId: string }>;
}

const ORIGIN_BADGE: Record<string, { label: string; className: string }> = {
  BEYOND_CREATED: { label: "Beyond", className: "bg-green-100 text-green-700" },
  IMPORTED_FROM_POS: { label: "Imported (POS)", className: "bg-blue-100 text-blue-700" },
  IMPORTED_FROM_DELIVERY: { label: "Imported (Delivery)", className: "bg-orange-100 text-orange-700" },
  IMPORTED_FROM_OTHER: { label: "Imported", className: "bg-gray-100 text-gray-600" },
};

function formatPrice(amount: number, currency: string) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount / 100);
}

export default async function ProductDetailPage({ params }: Props) {
  const { storeId, productId } = await params;
  await requireOwnerStoreAccess(storeId);

  const [product, recipes] = await Promise.all([
    getOwnerProduct(storeId, productId),
    getProductRecipes(storeId, productId),
  ]);

  if (!product) notFound();

  const originBadge = ORIGIN_BADGE[product.originType] ?? { label: product.originType, className: "bg-gray-100 text-gray-600" };

  return (
    <div className="max-w-5xl mx-auto px-4 pb-10 space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Link href={`/owner/stores/${storeId}/products`} className="hover:text-gray-700">
          ← Products
        </Link>
        <span className="text-gray-300">/</span>
        <span className="text-gray-800 font-medium">{product.name}</span>
      </div>

      {/* Product header */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-3 mb-1 flex-wrap">
              <h1 className="text-xl font-bold text-gray-900">{product.name}</h1>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${originBadge.className}`}>
                {originBadge.label}
              </span>
              {product.isSoldOut && (
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                  Sold Out
                </span>
              )}
              {product.isFeatured && (
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700">
                  ⭐ Featured
                </span>
              )}
            </div>
            {product.onlineName && product.onlineName !== product.name && (
              <p className="text-sm text-gray-500">Online: {product.onlineName}</p>
            )}
            {product.shortDescription && (
              <p className="text-sm text-gray-600 mt-1">{product.shortDescription}</p>
            )}
            {product.categories.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {product.categories.map((cat) => (
                  <span key={cat} className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-600">
                    {cat}
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-gray-900">
              {formatPrice(product.basePriceAmount, product.currency)}
            </div>
            <div className="flex gap-2 mt-1 text-xs">
              <span className={`px-1.5 py-0.5 rounded ${product.isVisibleOnOnlineOrder ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-400"}`}>
                Online {product.isVisibleOnOnlineOrder ? "ON" : "OFF"}
              </span>
              <span className={`px-1.5 py-0.5 rounded ${product.isVisibleOnSubscription ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-400"}`}>
                Subscription {product.isVisibleOnSubscription ? "ON" : "OFF"}
              </span>
            </div>
          </div>
        </div>
        {product.internalNote && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Internal Note</div>
            <p className="text-sm text-gray-600">{product.internalNote}</p>
          </div>
        )}
      </div>

      {/* Recipe section — core of this page */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-gray-800">Recipe & Cost</h2>
          <span className="text-xs text-gray-400">
            Recipes and ingredient costs for this product.
          </span>
        </div>
        <ProductRecipePanel catalogProductId={productId} recipes={recipes} />
      </div>
    </div>
  );
}
