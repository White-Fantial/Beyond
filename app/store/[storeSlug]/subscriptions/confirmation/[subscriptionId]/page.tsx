import SubscriptionConfirmationClient from "./SubscriptionConfirmationClient";

interface Props {
  params: Promise<{ storeSlug: string; subscriptionId: string }>;
}

export default async function SubscriptionConfirmationPage({ params }: Props) {
  const { storeSlug, subscriptionId } = await params;
  return (
    <SubscriptionConfirmationClient
      storeSlug={storeSlug}
      subscriptionId={subscriptionId}
    />
  );
}
