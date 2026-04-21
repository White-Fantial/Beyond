import OwnerOverviewCard from "./OwnerOverviewCard";
import { formatMoneyFromMinor } from "@/lib/format/money";
import type { OwnerDashboardData } from "@/types/owner-dashboard";

interface OwnerOverviewGridProps {
  overview: OwnerDashboardData["businessOverview"];
}

export default function OwnerOverviewGrid({ overview }: OwnerOverviewGridProps) {
  const {
    totalStores,
    totalStaff,
    posConnections,
    deliveryConnections,
    todayOrders,
    todayRevenueAmount,
    monthlyRevenueAmount,
  } = overview;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
      <OwnerOverviewCard label="Total Stores" value={totalStores} />
      <OwnerOverviewCard label="Total Staff" value={totalStaff} />
      <OwnerOverviewCard
        label="POS Connected"
        value={posConnections}
        accent={posConnections > 0 ? "green" : "default"}
      />
      <OwnerOverviewCard
        label="Delivery Connected"
        value={deliveryConnections}
        accent={deliveryConnections > 0 ? "green" : "default"}
      />
      <OwnerOverviewCard
        label="Today's Orders"
        value={todayOrders}
        accent="blue"
      />
      <OwnerOverviewCard
        label="Today's Revenue"
        value={formatMoneyFromMinor(todayRevenueAmount)}
        accent="blue"
      />
      <OwnerOverviewCard
        label="Monthly Revenue"
        value={formatMoneyFromMinor(monthlyRevenueAmount)}
        accent="blue"
        sub="this month"
      />
    </div>
  );
}
