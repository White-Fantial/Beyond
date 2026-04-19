import { cookies } from "next/headers";
import { requirePermission } from "@/lib/auth/permissions";
import { PERMISSIONS } from "@/lib/auth/constants";
import { resolveCustomerStoreContext, CUSTOMER_STORE_COOKIE } from "@/lib/customer-store-context";
import { listCustomerSubscriptions } from "@/services/customer.service";
import { SubscriptionCard } from "@/components/customer/subscriptions/SubscriptionCard";

interface Props {
  params: Promise<{ tenantSlug: string }>;
}

export default async function BrandedSubscriptionsPage({ params }: Props) {
  const ctx = await requirePermission(PERMISSIONS.CUSTOMER_APP);
  const { tenantSlug } = await params;

  const cookieStore = await cookies();
  const cookieStoreId = cookieStore.get(CUSTOMER_STORE_COOKIE)?.value;

  const storeCtx = await resolveCustomerStoreContext(tenantSlug, {
    cookieStoreId,
    userEmail: ctx.email,
  });

  const scope = storeCtx
    ? { tenantId: storeCtx.tenantId, storeId: storeCtx.storeId }
    : undefined;

  const subscriptions = await listCustomerSubscriptions(ctx.email, scope);

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
      <h1 className="text-xl font-bold text-gray-900 mb-6">구독 관리</h1>
      {storeCtx && (
        <p className="text-sm text-gray-400 mb-4">📍 {storeCtx.storeName}</p>
      )}

      {subscriptions.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-4xl mb-3">🔄</div>
          <p className="text-gray-500">구독 내역이 없습니다.</p>
        </div>
      ) : (
        <div className="space-y-8">
          <Section title="이용 중" items={active} />
          <Section title="일시정지" items={paused} />
          <Section title="해지됨" items={cancelled} />
        </div>
      )}
    </div>
  );
}
