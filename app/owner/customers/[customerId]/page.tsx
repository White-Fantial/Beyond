import Link from "next/link";
import { notFound } from "next/navigation";
import { requireOwnerPortalAccess } from "@/lib/owner/auth-guard";
import {
  getOwnerCustomerDetail,
  getOwnerCustomerOrders,
  getOwnerCustomerSubscriptions,
} from "@/services/owner/customer-service";
import CustomerDetailTabs from "@/components/owner/customers/CustomerDetailTabs";

interface Props {
  params: Promise<{ customerId: string }>;
}

export default async function CustomerDetailPage({ params }: Props) {
  const { customerId } = await params;
  const ctx = await requireOwnerPortalAccess();
  const tenantId = ctx.tenantMemberships[0]?.tenantId ?? "";

  const [detail, ordersResult, subscriptions] = await Promise.all([
    getOwnerCustomerDetail(customerId, tenantId),
    getOwnerCustomerOrders(customerId, tenantId, { pageSize: 50 }),
    getOwnerCustomerSubscriptions(customerId, tenantId),
  ]);

  if (!detail) notFound();

  const isActiveSubscriber = detail.activeSubscriptionCount > 0;
  const isPausedOnly =
    detail.activeSubscriptionCount === 0 && detail.pausedSubscriptionCount > 0;

  return (
    <div>
      {/* Back link */}
      <div className="mb-4">
        <Link
          href="/owner/customers"
          className="text-xs text-gray-500 hover:text-gray-700"
        >
          ← Back to Customers
        </Link>
      </div>

      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">
            {detail.name ?? (
              <span className="text-gray-400 font-normal italic">Unknown Customer</span>
            )}
          </h1>
          <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-gray-500">
            {detail.email && <span>{detail.email}</span>}
            {detail.phone && <span>{detail.phone}</span>}
          </div>
        </div>
        <div className="shrink-0 flex items-center gap-2">
          {isActiveSubscriber && (
            <span className="inline-flex items-center px-2.5 py-1 rounded text-xs font-medium bg-green-100 text-green-700">
              Active Subscriber
            </span>
          )}
          {isPausedOnly && (
            <span className="inline-flex items-center px-2.5 py-1 rounded text-xs font-medium bg-yellow-100 text-yellow-700">
              Paused
            </span>
          )}
        </div>
      </div>

      {/* Tabs with all data */}
      <CustomerDetailTabs
        customerId={customerId}
        detail={detail}
        orders={ordersResult}
        subscriptions={subscriptions}
      />
    </div>
  );
}
