"use client";

import type { SystemHealthStatus, SystemSeverity } from "@/types/admin-system";
import { healthStatusLabel } from "@/lib/admin/system/labels";
import { healthStatusColor } from "@/lib/admin/system/health";

interface AdminSystemWarningBannerProps {
  overallStatus: SystemHealthStatus;
  overallSeverity: SystemSeverity;
  criticalCount: number;
  degradedCount: number;
  incidentCount: number;
}

export function AdminSystemWarningBanner({
  overallStatus,
  criticalCount,
  degradedCount,
  incidentCount,
}: AdminSystemWarningBannerProps) {
  if (overallStatus === "HEALTHY") return null;

  const colors = healthStatusColor(overallStatus);
  const icon = overallStatus === "DOWN" ? "🔴" : "⚠️";

  const parts: string[] = [];
  if (criticalCount > 0) parts.push(`Critical: ${criticalCount}`);
  if (degradedCount > 0) parts.push(`Degraded: ${degradedCount}`);
  if (incidentCount > 0) parts.push(`Incidents: ${incidentCount}`);

  return (
    <div
      className={`flex items-start gap-3 rounded-lg border px-4 py-3 text-sm ${colors.bg} ${colors.border} ${colors.text}`}
    >
      <span className="text-base leading-none mt-0.5">{icon}</span>
      <div>
        <span className="font-semibold">
          Platform status: {healthStatusLabel(overallStatus)}
        </span>
        {parts.length > 0 && (
          <span className="ml-2 opacity-80">— {parts.join(", ")}</span>
        )}
        <p className="mt-1 text-xs opacity-70">
          See the component cards or incident table below for details.
        </p>
      </div>
    </div>
  );
}
