import { Suspense } from "react";
import { requirePlatformAdmin } from "@/lib/admin/auth-guard";
import { listAdminLogs } from "@/services/admin/admin-log.service";
import { parseAdminLogFilters } from "@/lib/admin/logs/filters";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import AdminPagination from "@/components/admin/AdminPagination";
import AdminLogTable from "@/components/admin/logs/AdminLogTable";
import AdminLogFilters from "@/components/admin/logs/AdminLogFilters";
import ExportButton from "@/components/ExportButton";
import type { AdminLogFilterParams } from "@/types/admin-logs";

interface PageProps {
  searchParams: Promise<AdminLogFilterParams>;
}

export default async function AdminLogsPage({ searchParams }: PageProps) {
  await requirePlatformAdmin();
  const rawParams = await searchParams;
  const filters = parseAdminLogFilters(rawParams);

  const { items, pagination } = await listAdminLogs(filters);

  const hasFilters = !!(
    rawParams.q ||
    rawParams.logType ||
    rawParams.from ||
    rawParams.to ||
    rawParams.tenantId ||
    rawParams.storeId ||
    rawParams.provider ||
    rawParams.status ||
    rawParams.actionType ||
    rawParams.errorOnly
  );

  // Build export URL preserving current filters
  const exportParams = new URLSearchParams();
  if (rawParams.q) exportParams.set("q", rawParams.q);
  if (rawParams.logType) exportParams.set("logType", rawParams.logType);
  if (rawParams.from) exportParams.set("from", rawParams.from);
  if (rawParams.to) exportParams.set("to", rawParams.to);
  if (rawParams.tenantId) exportParams.set("tenantId", rawParams.tenantId);
  if (rawParams.storeId) exportParams.set("storeId", rawParams.storeId);
  if (rawParams.provider) exportParams.set("provider", rawParams.provider);
  if (rawParams.status) exportParams.set("status", rawParams.status);
  if (rawParams.actionType) exportParams.set("actionType", rawParams.actionType);
  if (rawParams.errorOnly) exportParams.set("errorOnly", rawParams.errorOnly);
  const exportBase = `/api/admin/logs/export?${exportParams.toString()}`;

  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <AdminPageHeader
          title="Logs"
          description="View unified audit, integration, webhook, and order logs across the platform."
        />
        <div className="flex items-center gap-2 mt-1 flex-shrink-0">
          <ExportButton href={`${exportBase}&format=csv`} label="Export CSV" />
          <ExportButton href={`${exportBase}&format=html`} label="Export PDF" />
        </div>
      </div>

      <Suspense>
        <AdminLogFilters
          current={{
            q: rawParams.q,
            logType: rawParams.logType,
            from: rawParams.from,
            to: rawParams.to,
            tenantId: rawParams.tenantId,
            storeId: rawParams.storeId,
            provider: rawParams.provider,
            status: rawParams.status,
            actionType: rawParams.actionType,
            errorOnly: rawParams.errorOnly,
          }}
        />
      </Suspense>

      <AdminLogTable items={items} hasFilters={hasFilters} />

      <div className="mt-4">
        <Suspense>
          <AdminPagination pagination={pagination} />
        </Suspense>
      </div>
    </div>
  );
}
