import { Suspense } from "react";
import { requirePlatformAdmin } from "@/lib/admin/auth-guard";
import { parseAdminAnalyticsFilters } from "@/lib/admin/analytics/filters";
import {
  getAdminAnalyticsOverview,
  getAdminOrdersTimeSeries,
  getAdminProviderHealthBreakdown,
  getAdminFailureBreakdown,
  getAdminTopProblemStores,
  getAdminAttentionSummary,
} from "@/services/admin/admin-analytics.service";
import { auditAdminAnalyticsViewed } from "@/lib/audit";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import AdminAnalyticsFilterBar from "@/components/admin/analytics/AdminAnalyticsFilterBar";
import AdminKpiGrid from "@/components/admin/analytics/AdminKpiGrid";
import AdminTrendChart from "@/components/admin/analytics/AdminTrendChart";
import AdminProviderHealthTable from "@/components/admin/analytics/AdminProviderHealthTable";
import AdminFailureBreakdownTable from "@/components/admin/analytics/AdminFailureBreakdownTable";
import AdminProblemStoresTable from "@/components/admin/analytics/AdminProblemStoresTable";
import AdminAttentionSummaryCards from "@/components/admin/analytics/AdminAttentionSummaryCards";

interface PageProps {
  searchParams: Record<string, string | string[] | undefined>;
}

export default async function AdminAnalyticsPage({ searchParams }: PageProps) {
  const ctx = await requirePlatformAdmin();
  const rawParams = searchParams;
  const filters = parseAdminAnalyticsFilters(rawParams);

  // Fire-and-forget audit log
  void auditAdminAnalyticsViewed(ctx.userId, {
    from: filters.from.toISOString(),
    to: filters.to.toISOString(),
  });

  const [overview, timeSeries, providerHealth, failureBreakdown, problemStores, attentionSummary] =
    await Promise.all([
      getAdminAnalyticsOverview(filters),
      getAdminOrdersTimeSeries(filters),
      getAdminProviderHealthBreakdown(filters),
      getAdminFailureBreakdown(filters),
      getAdminTopProblemStores(filters),
      getAdminAttentionSummary(filters),
    ]);

  const fromStr = filters.from.toISOString().slice(0, 10);
  const toStr = filters.to.toISOString().slice(0, 10);

  const trendSummary = (() => {
    if (timeSeries.length < 2) return undefined;
    const last = timeSeries[timeSeries.length - 1];
    const prev = timeSeries[timeSeries.length - 2];
    if (!last || !prev || prev.totalOrders === 0) return undefined;
    const delta = ((last.totalOrders - prev.totalOrders) / prev.totalOrders) * 100;
    return delta > 0
      ? `Orders are up ${delta.toFixed(1)}% compared to the previous day.`
      : `Orders are down ${Math.abs(delta).toFixed(1)}% compared to the previous day.`;
  })();

  return (
    <div>
      <AdminPageHeader
        title="Platform Analytics"
        description="Monitor platform-wide operational health and KPIs."
      />

      <Suspense fallback={null}>
        <AdminAnalyticsFilterBar
          currentFrom={fromStr}
          currentTo={toStr}
          currentTenantId={filters.tenantId}
          currentStoreId={filters.storeId}
          currentProvider={filters.provider}
        />
      </Suspense>

      {/* Attention Summary */}
      <AdminAttentionSummaryCards summary={attentionSummary} />

      {/* KPI Grid */}
      <AdminKpiGrid overview={overview} />

      {/* Trend Charts */}
      <AdminTrendChart
        data={timeSeries}
        currencyCode={overview.currencyCode}
        summary={trendSummary}
      />

      {/* Provider Health + Failure Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AdminProviderHealthTable rows={providerHealth} />
        <AdminFailureBreakdownTable rows={failureBreakdown} />
      </div>

      {/* Top Problem Stores */}
      <AdminProblemStoresTable rows={problemStores} />
    </div>
  );
}
