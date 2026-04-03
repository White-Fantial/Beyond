import { requirePermission } from "@/lib/auth/permissions";
import { PERMISSIONS } from "@/lib/auth/constants";
import { listCustomerSubscriptions } from "@/services/customer.service";
import { SubscriptionCard } from "@/components/customer/subscriptions/SubscriptionCard";

export default async function CustomerSubscriptionsPage() {
  const ctx = await requirePermission(PERMISSIONS.CUSTOMER_APP);
  const subscriptions = await listCustomerSubscriptions(ctx.email);

  const active = subscriptions.filter((s) => s.status === "ACTIVE");
  const paused = subscriptions.filter((s) => s.status === "PAUSED");
  const cancelled = subscriptions.filter((s) => s.status === "CANCELLED");

  function Section({ title, items }: { title: string; items: typeof subscriptions }) {
    if (items.length === 0) return null;
    return (
      <div>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
          {title}
        </h2>
        <div className="space-y-3">
          {items.map((sub) => (
            <SubscriptionCard key={sub.id} subscription={sub} onAction={() => {}} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 mb-6">My Subscriptions</h1>

      {subscriptions.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-4xl mb-3">🔄</div>
          <p className="text-gray-500">No subscriptions yet.</p>
        </div>
      ) : (
        <div className="space-y-8">
          <Section title="Active" items={active} />
          <Section title="Paused" items={paused} />
          <Section title="Cancelled" items={cancelled} />
        </div>
      )}
    </div>
  );
}
