import Link from "next/link";
import type { AdminLogDetail } from "@/types/admin-logs";

interface AdminLogContextLinksProps {
  log: AdminLogDetail;
}

interface ContextLink {
  label: string;
  href: string;
  value: string;
}

function buildLinks(log: AdminLogDetail): ContextLink[] {
  const links: ContextLink[] = [];

  if (log.tenantId) {
    links.push({
      label: "Tenant",
      href: `/admin/tenants/${log.tenantId}`,
      value: log.tenantName ?? log.tenantId,
    });
    links.push({
      label: "Tenant Logs",
      href: `/admin/logs?tenantId=${log.tenantId}`,
      value: "→ Related Logs 보기",
    });
  }

  if (log.storeId) {
    links.push({
      label: "Store",
      href: `/admin/stores/${log.storeId}`,
      value: log.storeName ?? log.storeId,
    });
    links.push({
      label: "Store Logs",
      href: `/admin/logs?storeId=${log.storeId}`,
      value: "→ Related Logs 보기",
    });
  }

  if (log.logType === "AUDIT" && log.actorUserId) {
    const actorLabel =
      log.actorUserName && log.actorUserEmail
        ? `${log.actorUserName} (${log.actorUserEmail})`
        : log.actorUserId;
    links.push({
      label: "Actor User",
      href: `/admin/users/${log.actorUserId}`,
      value: actorLabel,
    });
    links.push({
      label: "User Logs",
      href: `/admin/logs?userId=${log.actorUserId}`,
      value: "→ Related Logs 보기",
    });
  }

  if (log.logType === "AUDIT" && log.targetType === "User") {
    links.push({
      label: "Target User",
      href: `/admin/users/${log.targetId}`,
      value: log.targetId,
    });
  }

  if (log.logType === "ORDER_EVENT") {
    links.push({
      label: "Order Logs",
      href: `/admin/logs?logType=ORDER_EVENT`,
      value: `→ Order Event Logs`,
    });
    if (log.channelType) {
      links.push({
        label: "Provider Logs",
        href: `/admin/logs?provider=${log.channelType}`,
        value: `→ ${log.channelType} Logs`,
      });
    }
  }

  if (log.logType === "CONNECTION_ACTION") {
    if (log.provider) {
      links.push({
        label: "Provider Logs",
        href: `/admin/logs?logType=CONNECTION_ACTION&provider=${log.provider}`,
        value: `→ ${log.provider} Connection Logs`,
      });
    }
    if (log.actorUserId) {
      links.push({
        label: "Actor User",
        href: `/admin/users/${log.actorUserId}`,
        value: log.actorUserId,
      });
    }
  }

  if (log.logType === "WEBHOOK" && log.channelType) {
    links.push({
      label: "Provider Logs",
      href: `/admin/logs?logType=WEBHOOK&provider=${log.channelType}`,
      value: `→ ${log.channelType} Webhook Logs`,
    });
  }

  return links;
}

export default function AdminLogContextLinks({ log }: AdminLogContextLinksProps) {
  const links = buildLinks(log);

  if (links.length === 0) return null;

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
      <h2 className="text-sm font-semibold text-gray-700 mb-3">Related Links</h2>
      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
        {links.map((link, i) => (
          <div key={i} className="flex items-start gap-2">
            <dt className="text-xs text-gray-500 w-28 shrink-0 pt-0.5">{link.label}</dt>
            <dd>
              <Link
                href={link.href}
                className="text-xs text-blue-600 hover:underline break-all"
              >
                {link.value}
              </Link>
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
