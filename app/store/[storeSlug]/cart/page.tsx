import { notFound } from "next/navigation";
import { getStoreBySlugForCustomer } from "@/services/customer-menu.service";
import { getDefaultPickupTime } from "@/lib/order/pickup-time";
import { CartProvider } from "@/lib/cart/cart-context";
import CartPageInner from "./CartPageInner";

interface CartPageProps {
  params: { storeSlug: string };
}

/**
 * /store/[storeSlug]/cart — Customer cart page.
 *
 * NOTE: In production, cart state should be persisted across navigation
 * (e.g. via sessionStorage or server-side cart_sessions).
 * Currently, cart is held in React Context which resets on page navigation.
 * TODO: Persist cart across navigations.
 */
export default async function CartPage({ params }: CartPageProps) {
  const { storeSlug } = params;
  const store = await getStoreBySlugForCustomer(storeSlug);
  if (!store) notFound();

  const defaultPickupTime = getDefaultPickupTime();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Page header */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 sticky top-0 z-30">
        <h1 className="text-lg font-bold text-gray-900 text-center">Your Cart</h1>
      </header>
      <CartProvider storeId={store.id} initialPickupTime={defaultPickupTime}>
        <CartPageInner storeSlug={storeSlug} />
      </CartProvider>
    </div>
  );
}
