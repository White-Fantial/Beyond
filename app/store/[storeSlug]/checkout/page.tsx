import { notFound } from "next/navigation";
import { getStoreBySlugForCustomer } from "@/services/customer-menu.service";
import { getAvailablePickupSlots } from "@/lib/order/pickup-time";
import CheckoutClient from "./CheckoutClient";

interface CheckoutPageProps {
  params: Promise<{ storeSlug: string }>;
}

export default async function CheckoutPage({ params }: CheckoutPageProps) {
  const { storeSlug } = await params;
  const store = await getStoreBySlugForCustomer(storeSlug);
  if (!store) notFound();

  const slots = getAvailablePickupSlots({ slotCount: 12 }).map((s) => ({
    time: s.time.toISOString(),
    label: s.label,
    isAsap: s.isAsap,
  }));

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-4 py-3 sticky top-0 z-30">
        <h1 className="text-lg font-bold text-gray-900 text-center">Checkout</h1>
      </header>
      <CheckoutClient
        storeSlug={storeSlug}
        storeName={store.displayName || store.name}
        pickupSlots={slots}
      />
    </div>
  );
}
