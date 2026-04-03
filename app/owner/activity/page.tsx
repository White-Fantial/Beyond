import { requireOwnerPortalAccess } from "@/lib/owner/auth-guard";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import {
  getStaffActivityFeed,
  getRoleChangeHistory,
  getSettingsChangeLog,
  getIntegrationChangeLog,
} from "@/services/owner/owner-activity.service";
import ActivityFeedTable from "@/components/owner/activity/ActivityFeedTable";
import RoleChangeTable from "@/components/owner/activity/RoleChangeTable";
import SettingsChangeTable from "@/components/owner/activity/SettingsChangeTable";
import IntegrationChangeTable from "@/components/owner/activity/IntegrationChangeTable";
import ActivityFilterBar from "@/components/owner/activity/ActivityFilterBar";

const TABS = [
  { key: "feed", label: "Activity Feed" },
  { key: "roles", label: "Role Changes" },
  { key: "settings", label: "Settings Changes" },
  { key: "integrations", label: "Integration Changes" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

interface Props {
  searchParams: {
    tab?: string;
    storeId?: string;
    actorUserId?: string;
    startDate?: string;
    endDate?: string;
    page?: string;
  };
}

function buildUrl(searchParams: Props["searchParams"], tab: string, page: number): string {
  const params = new URLSearchParams();
  params.set("tab", tab);
  if (searchParams.storeId) params.set("storeId", searchParams.storeId);
  if (searchParams.actorUserId) params.set("actorUserId", searchParams.actorUserId);
  if (searchParams.startDate) params.set("startDate", searchParams.startDate);
  if (searchParams.endDate) params.set("endDate", searchParams.endDate);
  if (page > 1) params.set("page", String(page));
  return `/owner/activity?${params.toString()}`;
}

export default async function ActivityPage({ searchParams }: Props) {
  const ctx = await requireOwnerPortalAccess();
  const tenantId = ctx.tenantMemberships[0]?.tenantId ?? "";

  const tab: TabKey =
    TABS.some((t) => t.key === searchParams.tab)
      ? (searchParams.tab as TabKey)
      : "feed";

  const page = Math.max(1, parseInt(searchParams.page ?? "1", 10));
  const pageSize = 50;

  const filters = {
    storeId: searchParams.storeId,
    actorUserId: searchParams.actorUserId,
    startDate: searchParams.startDate,
    endDate: searchParams.endDate,
    page,
    pageSize,
  };

  const [stores, feedResult, rolesResult, settingsResult, integrationsResult] = await Promise.all([
    prisma.store.findMany({
      where: { tenantId },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    tab === "feed" ? getStaffActivityFeed(tenantId, filters) : null,
    tab === "roles" ? getRoleChangeHistory(tenantId, filters) : null,
    tab === "settings" ? getSettingsChangeLog(tenantId, filters) : null,
    tab === "integrations" ? getIntegrationChangeLog(tenantId, filters) : null,
  ]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Activity &amp; Audit</h1>
        <p className="mt-1 text-sm text-gray-500">
          Read-only view of staff actions, role changes, settings updates, and integration events
          across all stores.
        </p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 border-b border-gray-200 mb-5">
        {TABS.map((t) => {
          const isActive = t.key === tab;
          return (
            <Link
              key={t.key}
              href={buildUrl(searchParams, t.key, 1)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
                isActive
                  ? "border-brand-600 text-brand-700"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {t.label}
            </Link>
          );
        })}
      </div>

      {/* Filters */}
      <div className="mb-4">
        <ActivityFilterBar stores={stores} tab={tab} />
      </div>

      {/* Tab content */}
      {tab === "feed" && feedResult && (
        <ActivityFeedTable
          items={feedResult.items}
          total={feedResult.total}
          page={feedResult.page}
          pageSize={feedResult.pageSize}
          buildUrl={(p) => buildUrl(searchParams, "feed", p)}
        />
      )}
      {tab === "roles" && rolesResult && (
        <RoleChangeTable
          items={rolesResult.items}
          total={rolesResult.total}
          page={rolesResult.page}
          pageSize={rolesResult.pageSize}
          buildUrl={(p) => buildUrl(searchParams, "roles", p)}
        />
      )}
      {tab === "settings" && settingsResult && (
        <SettingsChangeTable
          items={settingsResult.items}
          total={settingsResult.total}
          page={settingsResult.page}
          pageSize={settingsResult.pageSize}
          buildUrl={(p) => buildUrl(searchParams, "settings", p)}
        />
      )}
      {tab === "integrations" && integrationsResult && (
        <IntegrationChangeTable
          items={integrationsResult.items}
          total={integrationsResult.total}
          page={integrationsResult.page}
          pageSize={integrationsResult.pageSize}
          buildUrl={(p) => buildUrl(searchParams, "integrations", p)}
        />
      )}
    </div>
  );
}
