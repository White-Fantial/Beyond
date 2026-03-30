import Link from "next/link";

interface SubscriptionEntryLinkProps {
  storeSlug: string;
}

export default function SubscriptionEntryLink({
  storeSlug,
}: SubscriptionEntryLinkProps) {
  return (
    <Link
      href={`/store/${storeSlug}/subscriptions`}
      className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-50 text-purple-700 text-sm font-medium hover:bg-purple-100 transition-colors"
    >
      <span aria-hidden="true">🔄</span>
      <span>View Subscription Plans</span>
      <span className="ml-auto text-purple-400" aria-hidden="true">
        ›
      </span>
    </Link>
  );
}
