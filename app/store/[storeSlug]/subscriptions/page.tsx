import { notFound } from "next/navigation";
import Link from "next/link";
import { getStoreBySlugForCustomer, getSubscriptionCatalogForStore } from "@/services/customer-menu.service";
import { getDefaultPickupTime } from "@/lib/order/pickup-time";
import { CartProvider } from "@/lib/cart/cart-context";
import OrderPageClient from "../OrderPageClient";

interface SubscriptionsPageProps {
  params: { storeSlug: string };
}

/**
 * /store/[storeSlug]/subscriptions — Subscription entry page.
 *
 * Shows the same store catalog filtered for subscription-eligible products.
 * Shares the same Cart/ordering infrastructure as the regular order page.
 *
 * TODO: Extend with subscription builder / subscription checkout flow:
 *   - Frequency selection (weekly, bi-weekly, monthly)
 *   - Subscription plan summary
 *   - Subscription checkout & payment
 *   - Subscription management (pause, cancel, modify)
 */
export default async function SubscriptionsPage({ params }: SubscriptionsPageProps) {
  const { storeSlug } = params;
  const store = await getStoreBySlugForCustomer(storeSlug);
  if (!store) notFound();

  const catalog = await getSubscriptionCatalogForStore(store.id);
  const defaultPickupTime = getDefaultPickupTime();

  // If no subscription products are configured yet, show a placeholder
  if (catalog.categories.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white border-b border-gray-200 px-4 py-3 sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <Link
              href={`/store/${storeSlug}`}
              className="text-gray-500 hover:text-gray-700"
              aria-label="Back to menu"
            >
              ←
            </Link>
            <h1 className="text-lg font-bold text-gray-900">Subscription Plans</h1>
          </div>
        </header>
        <div className="max-w-lg mx-auto px-4 py-12 text-center">
          <div className="text-5xl mb-4">🔄</div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            Subscriptions Coming Soon
          </h2>
          <p className="text-gray-500 text-sm mb-6">
            {store.displayName || store.name} is setting up subscription plans.
            Check back soon!
          </p>
          <Link
            href={`/store/${storeSlug}`}
            className="inline-block px-6 py-3 bg-brand-600 text-white rounded-full font-semibold hover:bg-brand-700 transition-colors"
          >
            View Regular Menu
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Subscription banner */}
      <div className="bg-purple-600 text-white px-4 py-2 text-sm text-center font-medium">
        🔄 Subscription Menu — Subscribe &amp; Save
      </div>
      <CartProvider storeId={store.id} initialPickupTime={defaultPickupTime}>
        <OrderPageClient
          store={store}
          categories={catalog.categories}
          productsByCategory={catalog.productsByCategory}
          storeSlug={storeSlug}
        />
      </CartProvider>
    </div>
  );
}

export async function generateMetadata({ params }: SubscriptionsPageProps) {
  const store = await getStoreBySlugForCustomer(params.storeSlug);
  if (!store) return { title: "Store not found" };
  return {
    title: `Subscriptions — ${store.displayName || store.name}`,
  };
}
