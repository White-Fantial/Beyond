import { requirePlatformAdmin } from "@/lib/admin/auth-guard";
import { listApplications } from "@/services/provider/provider-onboarding.service";
import {
  PROVIDER_APPLICATION_STATUS_LABELS,
  type ProviderApplicationStatus,
} from "@/types/provider-onboarding";
import ProviderApplicationReviewPanel from "@/components/admin/ProviderApplicationReviewPanel";

export default async function AdminProviderApplicationsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  await requirePlatformAdmin();

  const { status: statusParam } = await searchParams;
  const status = (statusParam ?? "PENDING") as ProviderApplicationStatus;

  const result = await listApplications({ status, pageSize: 100 });

  const statusTabs: ProviderApplicationStatus[] = ["PENDING", "APPROVED", "REJECTED"];
  const statusColors: Record<ProviderApplicationStatus, string> = {
    PENDING: "bg-blue-100 text-blue-700",
    APPROVED: "bg-green-100 text-green-700",
    REJECTED: "bg-red-100 text-red-700",
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">프로바이더 신청 관리</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          레시피 프로바이더 신청을 검토하고 승인 또는 반려하세요.
        </p>
      </div>

      {/* Status tabs */}
      <div className="flex gap-2 mb-6">
        {statusTabs.map((s) => (
          <a
            key={s}
            href={`/admin/provider-applications?status=${s}`}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              status === s
                ? "bg-gray-900 text-white border-gray-900"
                : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
            }`}
          >
            {PROVIDER_APPLICATION_STATUS_LABELS[s]}
          </a>
        ))}
      </div>

      {result.items.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <p className="text-4xl mb-3">📭</p>
          <p className="text-sm">
            {PROVIDER_APPLICATION_STATUS_LABELS[status]} 신청이 없습니다.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {result.items.map((app) => (
            <div
              key={app.id}
              className="bg-white rounded-lg border border-gray-200 p-4"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-gray-900 text-sm">
                      {app.businessName}
                    </span>
                    <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                      {app.businessType === "COMPANY" ? "법인" : "개인"}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-xs text-gray-500 mb-1">
                    <span>신청자: {app.applicantName}</span>
                    <span>{app.applicantEmail}</span>
                  </div>

                  {app.taxId && (
                    <p className="text-xs text-gray-500">
                      사업자번호: {app.taxId}
                    </p>
                  )}
                  {app.portfolioUrl && (
                    <a
                      href={app.portfolioUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 hover:underline"
                    >
                      포트폴리오 →
                    </a>
                  )}
                  {app.introduction && (
                    <p className="text-xs text-gray-500 mt-1 italic">
                      &ldquo;{app.introduction}&rdquo;
                    </p>
                  )}
                  <div className="mt-2 text-xs text-gray-400">
                    신청일:{" "}
                    {new Date(app.createdAt).toLocaleDateString("ko-KR")}
                  </div>
                  {app.adminNotes && (
                    <p className="mt-1 text-xs text-gray-500">
                      관리자 메모: {app.adminNotes}
                    </p>
                  )}

                  {app.status === "PENDING" && (
                    <ProviderApplicationReviewPanel applicationId={app.id} />
                  )}
                </div>

                <div className="shrink-0">
                  <span
                    className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                      statusColors[app.status]
                    }`}
                  >
                    {PROVIDER_APPLICATION_STATUS_LABELS[app.status]}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 text-xs text-gray-400">총 {result.total}건</div>
    </div>
  );
}
