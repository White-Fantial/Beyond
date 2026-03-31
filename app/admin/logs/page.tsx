import { Suspense } from "react";
import { requirePlatformAdmin } from "@/lib/admin/auth-guard";
import { listAdminWebhookLogs } from "@/services/admin/admin-logs.service";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import AdminStatusFilter from "@/components/admin/AdminStatusFilter";
import AdminPagination from "@/components/admin/AdminPagination";
import WebhookLogTable from "@/components/admin/WebhookLogTable";

const PROCESSING_STATUS_OPTIONS = [
  { value: "SUCCESS", label: "성공" },
  { value: "FAILED", label: "실패" },
  { value: "SKIPPED", label: "건너뜀" },
  { value: "PENDING", label: "대기 중" },
];

const CHANNEL_TYPE_OPTIONS = [
  { value: "UBER_EATS", label: "Uber Eats" },
  { value: "DOORDASH", label: "DoorDash" },
  { value: "ONLINE", label: "온라인" },
  { value: "SUBSCRIPTION", label: "구독" },
  { value: "POS", label: "POS" },
  { value: "MANUAL", label: "수동" },
];

interface PageProps {
  searchParams: Promise<{ status?: string; channelType?: string; page?: string }>;
}

export default async function AdminLogsPage({ searchParams }: PageProps) {
  await requirePlatformAdmin();
  const params = await searchParams;

  const { items, pagination } = await listAdminWebhookLogs({
    status: params.status,
    channelType: params.channelType,
    page: params.page ? Number(params.page) : 1,
  });

  const hasFilter = !!(params.status || params.channelType);

  return (
    <div>
      <AdminPageHeader
        title="웹훅 로그"
        description="수신된 인바운드 웹훅 이벤트 로그를 조회합니다."
      />

      <div className="flex flex-col sm:flex-row gap-3 mb-4 flex-wrap">
        <Suspense>
          <AdminStatusFilter
            options={PROCESSING_STATUS_OPTIONS}
            allLabel="모든 처리 상태"
            paramName="status"
          />
        </Suspense>
        <Suspense>
          <AdminStatusFilter
            options={CHANNEL_TYPE_OPTIONS}
            allLabel="모든 채널"
            paramName="channelType"
          />
        </Suspense>
      </div>

      <WebhookLogTable
        items={items}
        emptyMessage={
          hasFilter
            ? "조건에 맞는 로그가 없습니다."
            : "웹훅 로그가 없습니다."
        }
      />

      <div className="mt-4">
        <Suspense>
          <AdminPagination pagination={pagination} />
        </Suspense>
      </div>
    </div>
  );
}
