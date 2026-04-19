import { requireOwnerPortalAccess } from "@/lib/owner/auth-guard";
import Link from "next/link";
import {
  listNotifications,
  markAllNotificationsRead,
} from "@/services/owner/owner-notification.service";
import type { NotificationType } from "@/types/owner-notifications";
import { relativeDate, TablePagination } from "@/components/owner/activity/tableUtils";
import { revalidatePath } from "next/cache";

const TABS = [
  { key: "all", label: "All" },
  { key: "unread", label: "Unread" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

const TYPE_LABELS: Record<NotificationType, string> = {
  ALERT_TRIGGERED: "Alert",
  SYSTEM_INFO: "System",
  BILLING_REMINDER: "Billing",
  SUBSCRIPTION_EVENT: "Subscription",
  INTEGRATION_ISSUE: "Integration",
  STAFF_ACTIVITY: "Staff",
};

const TYPE_COLORS: Record<NotificationType, string> = {
  ALERT_TRIGGERED: "bg-red-100 text-red-700",
  SYSTEM_INFO: "bg-gray-100 text-gray-600",
  BILLING_REMINDER: "bg-blue-100 text-blue-700",
  SUBSCRIPTION_EVENT: "bg-purple-100 text-purple-700",
  INTEGRATION_ISSUE: "bg-orange-100 text-orange-700",
  STAFF_ACTIVITY: "bg-green-100 text-green-700",
};

function typeIcon(type: NotificationType): string {
  switch (type) {
    case "ALERT_TRIGGERED": return "🚨";
    case "BILLING_REMINDER": return "💳";
    case "INTEGRATION_ISSUE": return "🔌";
    case "SUBSCRIPTION_EVENT": return "🔄";
    case "STAFF_ACTIVITY": return "👤";
    default: return "ℹ️";
  }
}

interface Props {
  searchParams: Promise<{
    tab?: string | string[];
    page?: string | string[];
  }>;
}

function firstParam(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

function buildUrl(
  searchParams: { tab?: string | string[]; page?: string | string[] },
  tab: string,
  page: number
): string {
  const params = new URLSearchParams();
  params.set("tab", tab);
  if (page > 1) params.set("page", String(page));
  return `/owner/notifications?${params.toString()}`;
}

export default async function NotificationsPage({ searchParams }: Props) {
  const ctx = await requireOwnerPortalAccess();
  const tenantId = ctx.tenantMemberships[0]?.tenantId ?? "";
  const params = await searchParams;
  const tabParam = firstParam(params.tab);
  const pageParam = firstParam(params.page);

  const tab: TabKey =
    TABS.some((t) => t.key === tabParam)
      ? (tabParam as TabKey)
      : "all";

  const page = Math.max(1, parseInt(pageParam ?? "1", 10));
  const pageSize = 50;

  const result = await listNotifications(tenantId, ctx.userId, {
    unreadOnly: tab === "unread",
    page,
    pageSize,
  });

  async function handleMarkAllRead() {
    "use server";
    const serverCtx = await requireOwnerPortalAccess();
    const serverTenantId = serverCtx.tenantMemberships[0]?.tenantId ?? "";
    await markAllNotificationsRead(serverTenantId, serverCtx.userId);
    revalidatePath("/owner/notifications");
  }

  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Notifications</h1>
          <p className="mt-1 text-sm text-gray-500">
            Alerts and system messages for your account.
          </p>
        </div>
        {result.unreadCount > 0 && (
          <form action={handleMarkAllRead}>
            <button
              type="submit"
              className="text-sm font-medium text-brand-600 hover:text-brand-800 bg-brand-50 hover:bg-brand-100 px-3 py-1.5 rounded-lg transition-colors"
            >
              Mark all read ({result.unreadCount})
            </button>
          </form>
        )}
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 border-b border-gray-200 mb-5">
        {TABS.map((t) => {
          const isActive = t.key === tab;
          return (
            <Link
              key={t.key}
              href={buildUrl(params, t.key, 1)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
                isActive
                  ? "border-brand-600 text-brand-700"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {t.label}
              {t.key === "unread" && result.unreadCount > 0 && (
                <span className="ml-1.5 inline-flex items-center justify-center min-w-[18px] h-4.5 px-1 rounded-full bg-red-100 text-red-600 text-[10px] font-bold">
                  {result.unreadCount}
                </span>
              )}
            </Link>
          );
        })}
      </div>

      {result.items.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-10 text-center">
          <p className="text-sm font-medium text-gray-700">
            {tab === "unread" ? "No unread notifications" : "No notifications yet"}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Alerts and system messages will appear here.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="divide-y divide-gray-100">
            {result.items.map((n) => (
              <div
                key={n.id}
                className={`flex items-start gap-4 px-5 py-4 ${!n.readAt ? "bg-brand-50" : ""}`}
              >
                <span className="text-xl mt-0.5 shrink-0">{typeIcon(n.type)}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium ${
                        TYPE_COLORS[n.type] ?? "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {TYPE_LABELS[n.type] ?? n.type}
                    </span>
                    {!n.readAt && (
                      <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold bg-brand-100 text-brand-700">
                        Unread
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-sm font-semibold text-gray-900">{n.title}</p>
                  <p className="mt-0.5 text-xs text-gray-500">{n.body}</p>
                  <p className="mt-1 text-[10px] text-gray-400">{relativeDate(n.createdAt)}</p>
                </div>
              </div>
            ))}
          </div>
          <TablePagination
            page={result.page}
            total={result.total}
            pageSize={result.pageSize}
            buildUrl={(p) => buildUrl(params, tab, p)}
          />
        </div>
      )}
    </div>
  );
}
