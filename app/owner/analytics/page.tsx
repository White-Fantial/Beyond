import { requireOwnerPortalAccess } from "@/lib/owner/auth-guard";
import { OWNER_PORTAL_MEMBERSHIP_ROLES } from "@/lib/auth/constants";
import { prisma } from "@/lib/prisma";
import {
  getHeatmapData,
  getRevenueForecast,
  getProductionEstimates,
  getChurnRiskSignals,
} from "@/services/owner/owner-analytics.service";
import AnalyticsFilterBar from "@/components/owner/analytics/AnalyticsFilterBar";
import AnalyticsSummaryCards from "@/components/owner/analytics/AnalyticsSummaryCards";
import HeatmapChart from "@/components/owner/analytics/HeatmapChart";
import ForecastChart from "@/components/owner/analytics/ForecastChart";
import ProductionEstimateTable from "@/components/owner/analytics/ProductionEstimateTable";
import ChurnRiskTable from "@/components/owner/analytics/ChurnRiskTable";
import type { ForecastHorizon } from "@/types/owner-analytics";
import { formatMinorCompact } from "@/lib/owner/reports/labels";

interface Props {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

function getString(v: string | string[] | undefined): string | undefined {
  if (Array.isArray(v)) return v[0];
  return v;
}

export default async function OwnerAnalyticsPage({ searchParams }: Props) {
  const ctx = await requireOwnerPortalAccess();
  const params = await searchParams;

  const ownerMembership =
    ctx.tenantMemberships.find((tm) =>
      OWNER_PORTAL_MEMBERSHIP_ROLES.includes(tm.membershipRole)
    ) ?? ctx.tenantMemberships[0];

  const tenantId = ownerMembership?.tenantId ?? "";

  if (!tenantId) {
    return (
      <div className="max-w-6xl mx-auto pb-12">
        <div className="bg-white rounded-xl border border-gray-200 p-10 text-center">
          <p className="text-sm font-medium text-gray-600">No tenant context found.</p>
        </div>
      </div>
    );
  }

  const storeId = getString(params?.storeId);
  const from = getString(params?.from);
  const to = getString(params?.to);
  const weekStartDate = getString(params?.weekStartDate);
  const rawHorizon = parseInt(getString(params?.horizon) ?? "7", 10);
  const horizon: ForecastHorizon = [7, 14, 30].includes(rawHorizon)
    ? (rawHorizon as ForecastHorizon)
    : 7;

  const stores = await prisma.store.findMany({
    where: { tenantId },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  const storeIds = storeId ? [storeId] : undefined;

  const [heatmap, forecast, production, churn] = await Promise.all([
    getHeatmapData(tenantId, storeId, from, to),
    getRevenueForecast(tenantId, storeId, horizon),
    getProductionEstimates(tenantId, storeIds, weekStartDate),
    getChurnRiskSignals(tenantId),
  ]);

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      {/* Page header */}
      <div>
        <h1 className="text-xl font-bold text-gray-900">Advanced Analytics &amp; Forecasting</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Heatmaps, revenue forecasts, production estimates, and churn risk signals.
        </p>
      </div>

      {/* Filters */}
      <AnalyticsFilterBar stores={stores} />

      {/* KPI summary cards */}
      <AnalyticsSummaryCards
        peakWeekday={heatmap.peakWeekday}
        peakHour={heatmap.peakHour}
        projectedRevenue={formatMinorCompact(forecast.projectedTotalMinor)}
        atRiskSubscribers={churn.customers.filter((c) => c.activeSubscriptions > 0).length}
      />

      {/* Heatmap + Forecast side by side on large screens */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <HeatmapChart data={heatmap} />
        <ForecastChart data={forecast} />
      </div>

      {/* Production estimates — full width */}
      <ProductionEstimateTable data={production} />

      {/* Churn risk — full width */}
      <ChurnRiskTable data={churn} />
    </div>
  );
}
