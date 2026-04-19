import { notFound } from "next/navigation";
import { getStoreBySlugForCustomer, getGuestOrderStatus } from "@/services/customer-menu.service";
import ConfirmationClient from "./ConfirmationClient";

interface ConfirmationPageProps {
  params: Promise<{ storeSlug: string; orderId: string }>;
}

export default async function ConfirmationPage({ params }: ConfirmationPageProps) {
  const { storeSlug, orderId } = await params;
  const store = await getStoreBySlugForCustomer(storeSlug);
  if (!store) notFound();

  const orderStatus = await getGuestOrderStatus(store.id, orderId);
  if (!orderStatus) notFound();

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-4 py-3 sticky top-0 z-30">
        <h1 className="text-lg font-bold text-gray-900 text-center">Order Confirmed</h1>
      </header>
      <ConfirmationClient
        storeSlug={storeSlug}
        storeName={store.displayName || store.name}
        orderId={orderId}
        initialStatus={orderStatus}
      />
    </div>
  );
}
