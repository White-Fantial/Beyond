import SubscriptionConfirmationClient from "./SubscriptionConfirmationClient";

interface Props {
  params: { storeSlug: string; subscriptionId: string };
}

export default async function SubscriptionConfirmationPage({ params }: Props) {
  const { storeSlug, subscriptionId } = params;
  return (
    <SubscriptionConfirmationClient
      storeSlug={storeSlug}
      subscriptionId={subscriptionId}
    />
  );
}
