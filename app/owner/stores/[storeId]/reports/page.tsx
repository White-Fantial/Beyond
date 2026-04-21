import { requireOwnerStoreAccess, resolveActorTenantId } from "@/services/owner/owner-authz.service";
import { parseReportFilters } from "@/lib/owner/reports/filters";
import { getStoreOwnerReports } from "@/services/owner/reports/owner-reports.service";
import OwnerReportsFilterBar from "@/components/owner/reports/OwnerReportsFilterBar";
import OwnerKpiGrid from "@/components/owner/reports/OwnerKpiGrid";
import OwnerRevenueTrendChart from "@/components/owner/reports/OwnerRevenueTrendChart";
import OwnerChannelBreakdownChart from "@/components/owner/reports/OwnerChannelBreakdownChart";
import OwnerCategoryPerformanceTable from "@/components/owner/reports/OwnerCategoryPerformanceTable";
import OwnerProductPerformanceTable from "@/components/owner/reports/OwnerProductPerformanceTable";
import OwnerSubscriptionSummaryCards from "@/components/owner/reports/OwnerSubscriptionSummaryCards";
import OwnerOrderHealthCard from "@/components/owner/reports/OwnerOrderHealthCard";
import OwnerSoldOutImpactCard from "@/components/owner/reports/OwnerSoldOutImpactCard";
import OwnerInsightsPanel from "@/components/owner/reports/OwnerInsightsPanel";

interface Props {
  params: Promise<{ storeId: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

export default async function StoreReportsPage({ params, searchParams }: Props) {
  const { storeId } = await params;
  const paramsInput = await searchParams;

  const ctx = await requireOwnerStoreAccess(storeId);
  const tenantId = resolveActorTenantId(ctx, storeId);

  const urlParams = new URLSearchParams();
  if (paramsInput) {
    for (const [key, value] of Object.entries(paramsInput)) {
      if (typeof value === "string") urlParams.set(key, value);
    }
  }
  const filters = parseReportFilters(urlParams);

  const report = await getStoreOwnerReports({ tenantId, storeId, filters });

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Store Reports</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {report.storeName} · {report.fromDate} — {report.toDate}
          </p>
        </div>
      </div>

      <OwnerReportsFilterBar filters={filters} />
      <OwnerKpiGrid summary={report.summary} comparison={report.comparisonSummary} />
      <OwnerRevenueTrendChart trend={report.revenueTrend} />
      <OwnerChannelBreakdownChart breakdown={report.channelBreakdown} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <OwnerCategoryPerformanceTable categories={report.categoryPerformance} />
        <OwnerProductPerformanceTable products={report.productPerformance} title="Product Performance" />
      </div>

      <OwnerSubscriptionSummaryCards summary={report.subscriptionSummary} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <OwnerOrderHealthCard health={report.orderHealth} />
        <OwnerSoldOutImpactCard impact={report.soldOutImpact} />
      </div>

      <OwnerInsightsPanel insights={report.insights} />
    </div>
  );
}
