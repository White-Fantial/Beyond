"use client";

import Link from "next/link";
import { useCart, cartItemKey } from "@/lib/cart/cart-context";
import { formatPickupLabel } from "@/lib/order/pickup-time";

interface CartPageInnerProps {
  storeSlug: string;
}

function formatPrice(amount: number): string {
  return new Intl.NumberFormat("en-NZ", {
    style: "currency",
    currency: "NZD",
    minimumFractionDigits: 2,
  }).format(amount / 100);
}

export default function CartPageInner({ storeSlug }: CartPageInnerProps) {
  const { state, removeItem, updateQuantity, totalAmount, totalItems } = useCart();

  const pickupLabel = state.pickupTime
    ? formatPickupLabel(state.pickupTime, false)
    : "Not selected";

  if (state.items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
        <div className="text-5xl mb-4">🛒</div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Your cart is empty</h2>
        <p className="text-gray-500 text-sm mb-6">
          Add items from the menu to get started.
        </p>
        <Link
          href={`/store/${storeSlug}`}
          className="px-6 py-3 bg-brand-600 text-white rounded-full font-semibold hover:bg-brand-700 transition-colors"
        >
          Back to Menu
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto pb-28">
      {/* Pickup time summary */}
      <div className="px-4 py-3 bg-brand-50 border-b border-brand-100 flex items-center gap-2">
        <span className="text-brand-600" aria-hidden="true">🕐</span>
        <span className="text-sm text-brand-700 font-medium">{pickupLabel}</span>
        <Link
          href={`/store/${storeSlug}`}
          className="ml-auto text-xs text-brand-600 underline"
        >
          Change
        </Link>
      </div>

      {/* Cart items */}
      <div className="divide-y divide-gray-100 px-4">
        {state.items.map((item) => {
          const itemKey = cartItemKey(item.productId, item.selectedModifiers);
          const lineTotal =
            item.quantity *
            (item.unitPrice +
              item.selectedModifiers.reduce(
                (sum, m) => sum + m.priceDeltaAmount,
                0
              ));
          return (
            <div key={itemKey} className="py-4">
              <div className="flex items-start gap-3">
                {item.imageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.imageUrl}
                    alt={item.displayName}
                    className="w-14 h-14 rounded-lg object-cover flex-shrink-0"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">
                    {item.displayName}
                  </p>
                  {item.selectedModifiers.length > 0 && (
                    <p className="text-xs text-gray-500 mt-0.5">
                      {item.selectedModifiers.map((m) => m.optionName).join(", ")}
                    </p>
                  )}
                  <p className="text-sm font-semibold text-gray-900 mt-1">
                    {formatPrice(lineTotal)}
                  </p>
                </div>
                {/* Quantity stepper */}
                <div className="flex items-center border border-gray-200 rounded-full overflow-hidden">
                  <button
                    onClick={() =>
                      updateQuantity(item.productId, itemKey, item.quantity - 1)
                    }
                    className="w-8 h-8 flex items-center justify-center text-gray-600 hover:bg-gray-100 transition-colors text-lg"
                    aria-label={`Decrease quantity of ${item.displayName}`}
                  >
                    −
                  </button>
                  <span className="w-7 text-center text-sm font-semibold text-gray-900">
                    {item.quantity}
                  </span>
                  <button
                    onClick={() =>
                      updateQuantity(item.productId, itemKey, item.quantity + 1)
                    }
                    className="w-8 h-8 flex items-center justify-center text-gray-600 hover:bg-gray-100 transition-colors text-lg"
                    aria-label={`Increase quantity of ${item.displayName}`}
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary + Checkout CTA */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 max-w-lg mx-auto">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm text-gray-600">
            {totalItems} item{totalItems !== 1 ? "s" : ""}
          </span>
          <span className="text-base font-bold text-gray-900">
            {formatPrice(totalAmount)}
          </span>
        </div>
        <Link
          href={`/store/${storeSlug}/checkout`}
          className="block w-full py-3 bg-brand-600 hover:bg-brand-700 text-white text-center font-semibold rounded-full transition-colors"
        >
          Proceed to Checkout
        </Link>
        <Link
          href={`/store/${storeSlug}`}
          className="block w-full py-2 text-center text-sm text-gray-500 hover:text-gray-700 mt-2"
        >
          ← Continue Shopping
        </Link>
      </div>
    </div>
  );
}
