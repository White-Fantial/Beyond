import Link from "next/link";

interface DrilldownLink {
  label: string;
  href: string;
  description?: string;
}

const DRILLDOWN_LINKS: DrilldownLink[] = [
  {
    label: "Logs — Webhook Errors",
    href: "/admin/logs?logType=WEBHOOK&errorOnly=1",
    description: "Webhook processing failure logs",
  },
  {
    label: "Logs — Connection Errors",
    href: "/admin/logs?logType=CONNECTION_ACTION&errorOnly=1",
    description: "Integration auth/refresh error logs",
  },
  {
    label: "Logs — Order Event Errors",
    href: "/admin/logs?logType=ORDER_EVENT&errorOnly=1",
    description: "Order pipeline event errors",
  },
  {
    label: "Jobs — Failures",
    href: "/admin/jobs?status=FAILED",
    description: "Recently failed jobs",
  },
  {
    label: "Jobs — Catalog Sync Failures",
    href: "/admin/jobs?jobType=CATALOG_SYNC&status=FAILED",
    description: "Failed CATALOG_SYNC jobs",
  },
  {
    label: "Jobs — Order Recovery Retries",
    href: "/admin/jobs?jobType=ORDER_RECOVERY_RETRY",
    description: "Order recovery retry job status",
  },
  {
    label: "Integrations",
    href: "/admin/integrations",
    description: "All integration connection statuses",
  },
  {
    label: "Billing — Past Due Tenants",
    href: "/admin/billing/tenants",
    description: "Subscription status and past due tenants",
  },
  {
    label: "Billing Overview",
    href: "/admin/billing",
    description: "Full billing overview",
  },
  {
    label: "Tenants",
    href: "/admin/tenants",
    description: "All tenants",
  },
];

export function AdminSystemDrilldownLinks() {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {DRILLDOWN_LINKS.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className="flex flex-col gap-0.5 rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm hover:border-blue-300 hover:bg-blue-50 transition-colors"
        >
          <span className="font-medium text-blue-700">{link.label}</span>
          {link.description && (
            <span className="text-xs text-gray-500">{link.description}</span>
          )}
        </Link>
      ))}
    </div>
  );
}
