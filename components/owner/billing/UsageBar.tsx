"use client";

const barColor: Record<string, string> = {
  NORMAL: "bg-green-500",
  NEAR_LIMIT: "bg-yellow-400",
  REACHED: "bg-orange-500",
  EXCEEDED: "bg-red-500",
};

export default function UsageBar({
  percent,
  status,
}: {
  percent: number | null;
  status: string;
}) {
  if (percent === null) return <span className="text-xs text-gray-400">Unlimited</span>;
  const clampedPct = Math.min(100, Math.max(0, percent));
  return (
    <div className="w-full bg-gray-100 rounded-full h-2">
      <div
        className={`h-2 rounded-full transition-all ${barColor[status] ?? "bg-green-500"}`}
        style={{ width: `${clampedPct}%` }}
      />
    </div>
  );
}
