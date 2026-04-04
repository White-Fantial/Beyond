import SubscriptionConfirmationClient from "./SubscriptionConfirmationClient";

interface Props {
  params: { storeSlug: string; subscriptionId: string };
}

export default function SubscriptionConfirmationPage({ params }: Props) {
  return (
    <SubscriptionConfirmationClient
      storeSlug={params.storeSlug}
      subscriptionId={params.subscriptionId}
    />
  );
}
