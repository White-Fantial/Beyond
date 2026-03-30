import Link from "next/link";
import { notFound } from "next/navigation";
import { getStoreBySlugForCustomer } from "@/services/customer-menu.service";

interface CheckoutPageProps {
  params: { storeSlug: string };
}

/**
 * /store/[storeSlug]/checkout — Customer checkout page.
 *
 * TODO: Implement full checkout flow:
 *   - Customer contact info (name, phone, email)
 *   - Pickup time confirmation
 *   - Payment integration (Stripe or other provider)
 *   - Order creation via Order domain service
 *   - Order confirmation page
 */
export default async function CheckoutPage({ params }: CheckoutPageProps) {
  const { storeSlug } = params;
  const store = await getStoreBySlugForCustomer(storeSlug);
  if (!store) notFound();

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-4 py-3 sticky top-0 z-30">
        <h1 className="text-lg font-bold text-gray-900 text-center">Checkout</h1>
      </header>

      <div className="max-w-lg mx-auto px-4 py-8 text-center">
        <div className="text-5xl mb-4">🚧</div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Coming Soon</h2>
        <p className="text-gray-500 text-sm mb-6">
          Checkout is being built. Order submission, payment, and confirmation
          will be available in a future update.
        </p>
        <Link
          href={`/store/${storeSlug}/cart`}
          className="inline-block px-6 py-3 bg-brand-600 text-white rounded-full font-semibold hover:bg-brand-700 transition-colors"
        >
          Back to Cart
        </Link>
      </div>
    </div>
  );
}
