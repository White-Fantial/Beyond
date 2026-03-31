interface AdminStatCardProps {
  label: string;
  value: number | string;
  sub?: string;
}

export default function AdminStatCard({ label, value, sub }: AdminStatCardProps) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="text-sm text-gray-500">{label}</div>
      <div className="text-2xl font-bold text-gray-900 mt-1">{value}</div>
      {sub && <div className="text-xs text-gray-400 mt-0.5">{sub}</div>}
    </div>
  );
}
