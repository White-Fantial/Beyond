import { Suspense } from "react";
import { requirePlatformAdmin } from "@/lib/admin/auth-guard";
import { listAdminLogs } from "@/services/admin/admin-log.service";
import { parseAdminLogFilters } from "@/lib/admin/logs/filters";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import AdminPagination from "@/components/admin/AdminPagination";
import AdminLogTable from "@/components/admin/logs/AdminLogTable";
import AdminLogFilters from "@/components/admin/logs/AdminLogFilters";
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

  return (
    <div>
      <AdminPageHeader
        title="로그"
        description="플랫폼 전체의 audit, integration, webhook, order 로그를 통합 조회합니다."
      />

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
