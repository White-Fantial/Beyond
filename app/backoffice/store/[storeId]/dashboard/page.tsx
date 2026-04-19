import { requireStoreAccess } from "@/lib/auth/permissions";
import { getDashboardData } from "@/services/backoffice/backoffice-dashboard.service";
import DashboardKpiGrid from "@/components/backoffice/dashboard/DashboardKpiGrid";
import DashboardChannelBreakdown from "@/components/backoffice/dashboard/DashboardChannelBreakdown";
import DashboardActiveOrdersList from "@/components/backoffice/dashboard/DashboardActiveOrdersList";

export default async function BackofficeDashboardPage({
  params,
}: {
  params: Promise<{ storeId: string }>;
}) {
  const { storeId } = await params;
  await requireStoreAccess(storeId);

  const data = await getDashboardData(storeId);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-gray-900">Store Dashboard</h1>
      <DashboardKpiGrid data={data} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DashboardChannelBreakdown breakdown={data.channelBreakdown} />
        <DashboardActiveOrdersList orders={data.activeOrders} />
      </div>
    </div>
  );
}
