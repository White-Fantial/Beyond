import { requireAuth } from "@/lib/auth/permissions";
import {
  getUserApplication,
  getProviderStripeStatus,
} from "@/services/provider/provider-onboarding.service";
import ProviderApplyForm from "@/components/provider/ProviderApplyForm";
import StripeConnectPanel from "@/components/provider/StripeConnectPanel";
import Link from "next/link";
import { PROVIDER_APPLICATION_STATUS_LABELS } from "@/types/provider-onboarding";

export default async function ProviderOnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ step?: string }>;
}) {
  const ctx = await requireAuth();
  const { step } = await searchParams;

  // Already a provider — show Stripe connect panel
  if (ctx.isRecipeProvider || ctx.isPlatformAdmin) {
    const stripeStatus = await getProviderStripeStatus(ctx.userId);

    return (
      <div className="max-w-xl mx-auto py-8 px-4 space-y-6">
        <div>
          <Link
            href="/provider/recipes"
            className="text-xs text-gray-400 hover:underline"
          >
            ← 내 레시피
          </Link>
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">프로바이더 설정</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            수익금 정산 계좌와 프로바이더 정보를 관리합니다.
          </p>
        </div>

        {step === "complete" && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-sm text-green-700">
            ✅ Stripe 온보딩이 완료되었습니다. 상태를 새로고침하여 확인하세요.
          </div>
        )}

        <StripeConnectPanel
          accountId={stripeStatus.accountId}
          onboarded={stripeStatus.onboarded}
          payoutsEnabled={stripeStatus.payoutsEnabled}
        />

        <div className="pt-4">
          <Link
            href="/provider/earnings"
            className="text-sm text-orange-600 hover:underline font-medium"
          >
            수익 대시보드 →
          </Link>
        </div>
      </div>
    );
  }

  // Check for existing application
  const application = await getUserApplication(ctx.userId);

  if (application && application.status !== "REJECTED") {
    const statusColors = {
      PENDING: "bg-blue-50 border-blue-200 text-blue-800",
      APPROVED: "bg-green-50 border-green-200 text-green-800",
      REJECTED: "bg-red-50 border-red-200 text-red-800",
    };

    return (
      <div className="max-w-xl mx-auto py-8 px-4 space-y-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">레시피 프로바이더 신청</h1>
        </div>

        <div
          className={`border rounded-lg p-4 space-y-2 ${
            statusColors[application.status]
          }`}
        >
          <p className="font-medium text-sm">
            신청 상태: {PROVIDER_APPLICATION_STATUS_LABELS[application.status]}
          </p>
          <p className="text-xs">사업자명: {application.businessName}</p>
          <p className="text-xs">
            신청일: {new Date(application.createdAt).toLocaleDateString("ko-KR")}
          </p>
          {application.adminNotes && (
            <p className="text-xs mt-2 font-medium">
              관리자 메모: {application.adminNotes}
            </p>
          )}
          {application.status === "PENDING" && (
            <p className="text-xs mt-2 text-blue-700">
              관리자 검토 중입니다. 승인되면 이메일로 안내드립니다.
            </p>
          )}
        </div>
      </div>
    );
  }

  // Show application form (no application, or previously rejected)
  return (
    <div className="max-w-xl mx-auto py-8 px-4 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">레시피 프로바이더 신청</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          레시피를 마켓플레이스에 판매하려면 프로바이더 신청이 필요합니다.
        </p>
      </div>

      {application?.status === "REJECTED" && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
          이전 신청이 반려되었습니다. 아래에서 재신청할 수 있습니다.
          {application.adminNotes && (
            <p className="mt-1 font-medium">사유: {application.adminNotes}</p>
          )}
        </div>
      )}

      {/* Steps overview */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <p className="text-xs font-semibold text-gray-700 mb-3">신청 절차</p>
        <ol className="space-y-2 text-xs text-gray-600 list-decimal list-inside">
          <li>신청서 작성 및 제출</li>
          <li>관리자 검토 및 승인 (1–3 영업일)</li>
          <li>Stripe Connect 계좌 연결 (판매 수익 정산용)</li>
          <li>레시피 등록 및 판매 시작</li>
        </ol>
      </div>

      <ProviderApplyForm />
    </div>
  );
}
