import { requireOwnerPortalAccess } from "@/lib/owner/auth-guard";
import { OWNER_PORTAL_MEMBERSHIP_ROLES } from "@/lib/auth/constants";
import { parseReportFilters } from "@/lib/owner/reports/filters";
import { getTenantOwnerReports } from "@/services/owner/reports/owner-reports.service";
import OwnerReportsFilterBar from "@/components/owner/reports/OwnerReportsFilterBar";
import OwnerKpiGrid from "@/components/owner/reports/OwnerKpiGrid";
import OwnerRevenueTrendChart from "@/components/owner/reports/OwnerRevenueTrendChart";
import OwnerChannelBreakdownChart from "@/components/owner/reports/OwnerChannelBreakdownChart";
import OwnerStoreComparisonTable from "@/components/owner/reports/OwnerStoreComparisonTable";
import OwnerProductPerformanceTable from "@/components/owner/reports/OwnerProductPerformanceTable";
import OwnerSubscriptionSummaryCards from "@/components/owner/reports/OwnerSubscriptionSummaryCards";
import OwnerInsightsPanel from "@/components/owner/reports/OwnerInsightsPanel";
import OwnerEmptyReportState from "@/components/owner/reports/OwnerEmptyReportState";
import ExportButton from "@/components/ExportButton";

interface Props {
  searchParams?: Record<string, string | string[] | undefined>;
}

export default async function OwnerReportsPage({ searchParams }: Props) {
  const ctx = await requireOwnerPortalAccess();

  const ownerMembership = ctx.tenantMemberships.find((tm) =>
    OWNER_PORTAL_MEMBERSHIP_ROLES.includes(tm.membershipRole)
  ) ?? ctx.tenantMemberships[0];

  const tenantId = ownerMembership?.tenantId ?? "";

  const params = new URLSearchParams();
  if (searchParams) {
    for (const [key, value] of Object.entries(searchParams)) {
      if (typeof value === "string") params.set(key, value);
    }
  }
  const filters = parseReportFilters(params);

  if (!tenantId) {
    return (
      <div className="max-w-6xl mx-auto pb-12">
        <OwnerEmptyReportState message="No tenant context found." />
      </div>
    );
  }

  const report = await getTenantOwnerReports({ tenantId, filters });

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Reports &amp; Analytics</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {report.fromDate} — {report.toDate} · {report.currencyCode}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ExportButton href="/api/owner/reports/export?format=csv" label="Export CSV" />
          <ExportButton href="/api/owner/reports/export?format=html" label="Export PDF" />
        </div>
      </div>

      <OwnerReportsFilterBar filters={filters} />
      <OwnerKpiGrid summary={report.summary} comparison={report.comparisonSummary} />
      <OwnerRevenueTrendChart trend={report.revenueTrend} currencyCode={report.currencyCode} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <OwnerChannelBreakdownChart breakdown={report.channelBreakdown} currencyCode={report.currencyCode} />
        <OwnerStoreComparisonTable stores={report.storeComparison} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <OwnerProductPerformanceTable products={report.topProducts} currencyCode={report.currencyCode} />
        <OwnerSubscriptionSummaryCards summary={report.subscriptionSummary} currencyCode={report.currencyCode} />
      </div>

      <OwnerInsightsPanel insights={report.insights} />
    </div>
  );
}
