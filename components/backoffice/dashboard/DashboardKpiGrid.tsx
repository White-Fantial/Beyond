import type { BackofficeDashboardData } from "@/types/backoffice";

function currencySymbol(code: string): string {
  const map: Record<string, string> = {
    NZD: "$", AUD: "$", USD: "$", GBP: "£", EUR: "€",
  };
  return map[code] ?? `${code} `;
}

function formatRevenue(minor: number, currencyCode: string): string {
  const major = minor / 100;
  const sym = currencySymbol(currencyCode);
  if (major >= 1_000_000) return `${sym}${(major / 1_000_000).toFixed(1)}M`;
  if (major >= 1_000) return `${sym}${(major / 1_000).toFixed(1)}k`;
  return `${sym}${major.toFixed(2)}`;
}

interface KpiCardProps {
  label: string;
  value: string;
  icon: string;
  highlight?: boolean;
}

function KpiCard({ label, value, icon, highlight = false }: KpiCardProps) {
  return (
    <div
      className={`rounded-xl border p-4 flex flex-col gap-1 ${
        highlight
          ? "bg-amber-50 border-amber-200"
          : "bg-white border-gray-200"
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
          {label}
        </span>
        <span className="text-base">{icon}</span>
      </div>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
    </div>
  );
}

interface Props {
  data: BackofficeDashboardData;
}

export default function DashboardKpiGrid({ data }: Props) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      <KpiCard
        label="Today's Orders"
        value={data.todayOrderCount.toLocaleString()}
        icon="📦"
      />
      <KpiCard
        label="Today's Revenue"
        value={formatRevenue(data.todayRevenueMinor, data.currencyCode)}
        icon="💰"
      />
      <KpiCard
        label="Active Orders"
        value={data.activeOrderCount.toLocaleString()}
        icon="⏳"
        highlight={data.activeOrderCount > 0}
      />
      <KpiCard
        label="Sold-Out Items"
        value={data.soldOutItemCount.toLocaleString()}
        icon="🚫"
        highlight={data.soldOutItemCount > 0}
      />
    </div>
  );
}
