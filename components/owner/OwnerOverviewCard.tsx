interface OwnerOverviewCardProps {
  label: string;
  value: string | number;
  sub?: string;
  accent?: "default" | "green" | "blue" | "orange";
}

const accentClass: Record<string, string> = {
  default: "text-gray-900",
  green: "text-green-700",
  blue: "text-brand-700",
  orange: "text-orange-600",
};

export default function OwnerOverviewCard({
  label,
  value,
  sub,
  accent = "default",
}: OwnerOverviewCardProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
      <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
        {label}
      </div>
      <div className={`text-2xl font-bold ${accentClass[accent]}`}>{value}</div>
      {sub && <div className="text-xs text-gray-400 mt-1">{sub}</div>}
    </div>
  );
}
