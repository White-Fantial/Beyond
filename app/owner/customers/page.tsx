import Link from "next/link";
import { requireOwnerPortalAccess } from "@/lib/owner/auth-guard";
import {
  getOwnerCustomers,
  getOwnerCustomerKpi,
} from "@/services/owner/customer-service";
import { prisma } from "@/lib/prisma";
import CustomerFilterBar from "./CustomerFilterBar";

function fmt(minorUnits: number) {
  return new Intl.NumberFormat("en-NZ", {
    style: "currency",
    currency: "NZD",
  }).format(minorUnits / 100);
}

function relativeDate(isoString: string | null): string {
  if (!isoString) return "—";
  const diff = Date.now() - new Date(isoString).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 30) return `${days}d ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

function KpiCard({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="text-2xl font-bold text-gray-900 mt-1">{value}</div>
    </div>
  );
}

interface Props {
  searchParams: Promise<{
    q?: string | string[];
    storeId?: string | string[];
    subscriptionStatus?: string | string[];
    sort?: string | string[];
    page?: string | string[];
  }>;
}

function firstParam(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

export default async function CustomersPage({ searchParams }: Props) {
  const ctx = await requireOwnerPortalAccess();
  const tenantId = ctx.tenantMemberships[0]?.tenantId ?? "";
  const params = await searchParams;

  const q = firstParam(params.q);
  const storeId = firstParam(params.storeId);
  const sortParam = firstParam(params.sort);
  const subscriptionStatusParam = firstParam(params.subscriptionStatus);
  const pageParam = firstParam(params.page);

  const page = Math.max(1, parseInt(pageParam ?? "1", 10));
  const pageSize = 25;

  const validSort = ["recent_activity", "lifetime_revenue", "total_orders", "newest_customer"];
  const validSubStatus = ["ACTIVE", "PAUSED", "CANCELLED", "NONE"];

  const sort = validSort.includes(sortParam ?? "")
    ? (sortParam as "recent_activity" | "lifetime_revenue" | "total_orders" | "newest_customer")
    : "recent_activity";

  const subscriptionStatus = validSubStatus.includes(subscriptionStatusParam ?? "")
    ? (subscriptionStatusParam as "ACTIVE" | "PAUSED" | "CANCELLED" | "NONE")
    : undefined;

  const [result, kpi, stores] = await Promise.all([
    getOwnerCustomers({
      tenantId,
      q,
      storeId,
      subscriptionStatus,
      sort,
      page,
      pageSize,
    }),
    getOwnerCustomerKpi(tenantId),
    prisma.store.findMany({
      where: { tenantId },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const totalPages = Math.ceil(result.total / pageSize);
  const hasFilters = !!(q || storeId || subscriptionStatusParam);


  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Customers</h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage customers, view order history, and control subscriptions across all stores.
        </p>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <KpiCard label="Total Customers" value={kpi.totalCustomers.toLocaleString()} />
        <KpiCard label="With Active Subscriptions" value={kpi.customersWithActiveSubscriptions.toLocaleString()} />
        <KpiCard label="Ordered (Last 30d)" value={kpi.customersOrderedLast30Days.toLocaleString()} />
        <KpiCard label="Total Active Subscriptions" value={kpi.totalActiveSubscriptions.toLocaleString()} />
      </div>

      {/* Filter Bar */}
      <div className="mb-4">
        <CustomerFilterBar stores={stores} />
      </div>

      {/* Table */}
      {result.customers.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-10 text-center">
          {hasFilters ? (
            <>
              <p className="text-sm font-medium text-gray-700">No results</p>
              <p className="text-xs text-gray-400 mt-1">
                Try adjusting your search or filter criteria.
              </p>
            </>
          ) : (
            <>
              <p className="text-sm font-medium text-gray-700">No customers yet</p>
              <p className="text-xs text-gray-400 mt-1">
                Customers will appear here once orders are placed.
              </p>
            </>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">Customer</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">Primary Store</th>
                  <th className="text-right px-4 py-2.5 text-xs font-medium text-gray-500">Orders</th>
                  <th className="text-right px-4 py-2.5 text-xs font-medium text-gray-500">Lifetime Revenue</th>
                  <th className="text-right px-4 py-2.5 text-xs font-medium text-gray-500">Active Subs</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">Last Order</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">Joined</th>
                  <th className="px-4 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {result.customers.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <Link href={`/owner/customers/${c.id}`} className="font-medium text-brand-700 hover:text-brand-900 hover:underline truncate max-w-[180px] block">
                        {c.name ?? <span className="text-gray-400 italic">Unknown</span>}
                      </Link>
                      {c.email && (
                        <div className="text-xs text-gray-500 truncate max-w-[180px]">{c.email}</div>
                      )}
                      {c.phone && (
                        <div className="text-xs text-gray-400">{c.phone}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-xs">
                      {c.primaryStoreName ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      <span className="font-medium text-gray-900">{c.totalOrders}</span>
                      {c.recent30dOrderCount > 0 && (
                        <span className="ml-1 text-xs text-gray-400">
                          (+{c.recent30dOrderCount} 30d)
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-gray-900">
                      {fmt(c.lifetimeRevenueMinorUnit)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {c.activeSubscriptionCount > 0 ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">
                          {c.activeSubscriptionCount}
                        </span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {relativeDate(c.lastOrderAt)}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {c.joinedAt
                        ? new Date(c.joinedAt).toLocaleDateString("en-NZ")
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/owner/customers/${c.id}`}
                        className="text-xs font-medium text-brand-600 hover:text-brand-800"
                      >
                        View →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="border-t border-gray-200 px-4 py-3 flex items-center justify-between bg-gray-50">
              <span className="text-xs text-gray-500">
                Showing {(page - 1) * pageSize + 1}–
                {Math.min(page * pageSize, result.total)} of {result.total} customers
              </span>
              <div className="flex items-center gap-2">
                {page > 1 && (
                  <Link
                    href={buildPageUrl(params, page - 1)}
                    className="px-3 py-1.5 text-xs border border-gray-200 rounded hover:bg-white text-gray-700"
                  >
                    ← Prev
                  </Link>
                )}
                <span className="text-xs text-gray-500">
                  Page {page} of {totalPages}
                </span>
                {page < totalPages && (
                  <Link
                    href={buildPageUrl(params, page + 1)}
                    className="px-3 py-1.5 text-xs border border-gray-200 rounded hover:bg-white text-gray-700"
                  >
                    Next →
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function buildPageUrl(
  searchParams: {
    q?: string | string[];
    storeId?: string | string[];
    subscriptionStatus?: string | string[];
    sort?: string | string[];
  },
  page: number
): string {
  const q = firstParam(searchParams.q);
  const storeId = firstParam(searchParams.storeId);
  const subscriptionStatus = firstParam(searchParams.subscriptionStatus);
  const sort = firstParam(searchParams.sort);

  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (storeId) params.set("storeId", storeId);
  if (subscriptionStatus) params.set("subscriptionStatus", subscriptionStatus);
  if (sort) params.set("sort", sort);
  params.set("page", String(page));
  return `/owner/customers?${params.toString()}`;
}
