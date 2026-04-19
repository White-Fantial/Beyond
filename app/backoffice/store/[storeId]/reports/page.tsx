import { requireStorePermission } from "@/lib/auth/permissions";
import { PERMISSIONS } from "@/lib/auth/constants";
import { getReportData } from "@/services/backoffice/backoffice-reports.service";
import ReportsFilterBar from "@/components/backoffice/reports/ReportsFilterBar";
import ReportsDailyChart from "@/components/backoffice/reports/ReportsDailyChart";
import ReportsChannelBreakdown from "@/components/backoffice/reports/ReportsChannelBreakdown";
import ReportsStatusFunnel from "@/components/backoffice/reports/ReportsStatusFunnel";
import ReportsTopProducts from "@/components/backoffice/reports/ReportsTopProducts";
import ReportsPeakHoursGrid from "@/components/backoffice/reports/ReportsPeakHoursGrid";

export default async function BackofficeReportsPage({
  params,
  searchParams,
}: {
  params: Promise<{ storeId: string }>;
  searchParams: Promise<{ days?: string }>;
}) {
  const { storeId } = await params;
  await requireStorePermission(storeId, PERMISSIONS.REPORTS);

  const { days: daysParam } = await searchParams;
  const days = daysParam ? parseInt(daysParam, 10) : 30;

  const data = await getReportData(storeId, days);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Reports</h1>
        <ReportsFilterBar days={data.days} />
      </div>
      <p className="text-sm text-gray-500">
        {data.fromDate} — {data.toDate} &middot; {data.days} days
      </p>
      <ReportsDailyChart series={data.dailySeries} currencyCode={data.currencyCode} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ReportsChannelBreakdown breakdown={data.channelBreakdown} currencyCode={data.currencyCode} />
        <ReportsStatusFunnel funnel={data.statusFunnel} />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ReportsTopProducts products={data.topProducts} />
        <ReportsPeakHoursGrid cells={data.peakHourCells} maxCount={data.peakHourMax} />
      </div>
    </div>
  );
}
