import { notFound } from "next/navigation";
import { getStoreBySlugForCustomer, getOnlineCatalogForStore } from "@/services/customer-menu.service";
import { getDefaultPickupTime } from "@/lib/order/pickup-time";
import { CartProvider } from "@/lib/cart/cart-context";
import OrderPageClient from "./OrderPageClient";

interface StoreOrderPageProps {
  params: { storeSlug: string };
}

/**
 * /store/[storeSlug] — Public customer-facing order entry page.
 *
 * Data fetched server-side from internal catalog only.
 * No authentication required (public ordering page).
 */
export default async function StoreOrderPage({ params }: StoreOrderPageProps) {
  const { storeSlug } = params;

  const store = await getStoreBySlugForCustomer(storeSlug);
  if (!store) notFound();

  const catalog = await getOnlineCatalogForStore(store.id);

  // Calculate default pickup time server-side (passed to CartProvider as initial value)
  const defaultPickupTime = getDefaultPickupTime();

  return (
    <CartProvider storeId={store.id} initialPickupTime={defaultPickupTime}>
      <OrderPageClient
        store={store}
        categories={catalog.categories}
        productsByCategory={catalog.productsByCategory}
        storeSlug={storeSlug}
      />
    </CartProvider>
  );
}

export async function generateMetadata({ params }: StoreOrderPageProps) {
  const store = await getStoreBySlugForCustomer(params.storeSlug);
  if (!store) return { title: "Store not found" };
  return {
    title: `Order from ${store.displayName || store.name}`,
    description: `Order online from ${store.displayName || store.name}`,
  };
}
