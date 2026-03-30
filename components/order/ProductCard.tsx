import type { CustomerProduct } from "@/services/customer-menu.service";

interface ProductCardProps {
  product: CustomerProduct;
  onAdd: (product: CustomerProduct) => void;
}

/** Formats an integer minor-unit price as a currency string. */
function formatPrice(amount: number, currency: string): string {
  return new Intl.NumberFormat("en-NZ", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(amount / 100);
}

export default function ProductCard({ product, onAdd }: ProductCardProps) {
  const price = formatPrice(product.basePriceAmount, product.currency);

  return (
    <article className="flex items-stretch py-3 gap-3">
      {/* Left: text content (70%) */}
      <div className="flex-1 min-w-0 flex flex-col justify-between gap-1">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`font-medium text-sm leading-snug ${
                product.isSoldOut ? "text-gray-400 line-through" : "text-gray-900"
              }`}
            >
              {product.displayName}
            </span>
            {product.isFeatured && !product.isSoldOut && (
              <span className="text-xs bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded-full font-medium">
                Featured
              </span>
            )}
            {product.isSoldOut && (
              <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full font-medium">
                Sold Out
              </span>
            )}
          </div>
          {product.shortDescription && (
            <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
              {product.shortDescription}
            </p>
          )}
        </div>
        <div className="flex items-center justify-between mt-2">
          <span className="text-sm font-semibold text-gray-900">{price}</span>
          <button
            onClick={() => onAdd(product)}
            disabled={product.isSoldOut}
            className={`ml-2 flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-semibold transition-colors ${
              product.isSoldOut
                ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                : "bg-brand-600 text-white hover:bg-brand-700 active:scale-95"
            }`}
            aria-label={`Add ${product.displayName} to cart`}
          >
            <span aria-hidden="true">+</span>
            <span>Add</span>
          </button>
        </div>
      </div>

      {/* Right: product image (30%) */}
      <div className="flex-shrink-0 w-[28%] max-w-[100px]">
        {product.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.imageUrl}
            alt={product.displayName}
            className="w-full aspect-square object-cover rounded-lg"
            loading="lazy"
          />
        ) : (
          <div className="w-full aspect-square rounded-lg bg-gradient-to-br from-brand-100 to-brand-50 flex items-center justify-center">
            <span className="text-2xl" aria-hidden="true">
              🍽️
            </span>
          </div>
        )}
      </div>
    </article>
  );
}
