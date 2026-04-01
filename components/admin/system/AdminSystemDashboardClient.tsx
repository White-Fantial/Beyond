"use client";

import { useState } from "react";
import type {
  AdminSystemDashboard,
  MetricsWindow,
} from "@/types/admin-system";
import { AdminSystemWarningBanner } from "@/components/admin/system/AdminSystemWarningBanner";
import { AdminSystemHealthOverview } from "@/components/admin/system/AdminSystemHealthOverview";
import { AdminSystemHealthCard } from "@/components/admin/system/AdminSystemHealthCard";
import { AdminSystemServiceStatusTable } from "@/components/admin/system/AdminSystemServiceStatusTable";
import { AdminSystemMetricsSection } from "@/components/admin/system/AdminSystemMetricsSection";
import { AdminSystemIncidentTable } from "@/components/admin/system/AdminSystemIncidentTable";
import { AdminSystemDrilldownLinks } from "@/components/admin/system/AdminSystemDrilldownLinks";

interface AdminSystemDashboardClientProps {
  dashboard: AdminSystemDashboard;
}

export function AdminSystemDashboardClient({
  dashboard,
}: AdminSystemDashboardClientProps) {
  const [activeWindow, setActiveWindow] = useState<MetricsWindow>("24h");

  const { overview, components, metrics24h, metrics7d, incidents } = dashboard;

  return (
    <div className="space-y-8">
      {/* Warning banner — only shown when not healthy */}
      <AdminSystemWarningBanner
        overallStatus={overview.overallStatus}
        overallSeverity={overview.overallSeverity}
        criticalCount={overview.criticalCount}
        degradedCount={overview.degradedCount}
        incidentCount={overview.incidentCount}
      />

      {/* Top overview card */}
      <AdminSystemHealthOverview overview={overview} />

      {/* Component health cards */}
      <section>
        <h2 className="mb-4 text-sm font-semibold text-gray-700">
          컴포넌트 상태
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {components.map((c) => (
            <AdminSystemHealthCard key={c.key} component={c} />
          ))}
        </div>
      </section>

      {/* Service status table */}
      <section>
        <h2 className="mb-4 text-sm font-semibold text-gray-700">
          서비스 상태 테이블
        </h2>
        <AdminSystemServiceStatusTable components={components} />
      </section>

      {/* Operational metrics */}
      <section>
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 className="text-sm font-semibold text-gray-700">운영 메트릭</h2>
          <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs">
            {(["24h", "7d"] as MetricsWindow[]).map((w) => (
              <button
                key={w}
                onClick={() => setActiveWindow(w)}
                className={`px-3 py-1.5 font-medium transition-colors ${
                  activeWindow === w
                    ? "bg-gray-800 text-white"
                    : "bg-white text-gray-600 hover:bg-gray-50"
                }`}
              >
                {w === "24h" ? "최근 24시간" : "최근 7일"}
              </button>
            ))}
          </div>
        </div>
        <AdminSystemMetricsSection
          metrics24h={metrics24h}
          metrics7d={metrics7d}
          activeWindow={activeWindow}
        />
      </section>

      {/* Incident / warning table */}
      <section>
        <h2 className="mb-4 text-sm font-semibold text-gray-700">
          인시던트 / 경고 현황
        </h2>
        <AdminSystemIncidentTable incidents={incidents} />
      </section>

      {/* Deep links */}
      <section>
        <h2 className="mb-4 text-sm font-semibold text-gray-700">
          운영 화면 바로가기
        </h2>
        <AdminSystemDrilldownLinks />
      </section>
    </div>
  );
}
