import Link from "next/link";

interface DrilldownLink {
  label: string;
  href: string;
  description?: string;
}

const DRILLDOWN_LINKS: DrilldownLink[] = [
  {
    label: "Logs — 웹훅 오류",
    href: "/admin/logs?logType=WEBHOOK&errorOnly=1",
    description: "웹훅 처리 실패 로그",
  },
  {
    label: "Logs — 연결 오류",
    href: "/admin/logs?logType=CONNECTION_ACTION&errorOnly=1",
    description: "연동 인증/갱신 오류 로그",
  },
  {
    label: "Logs — 주문 이벤트 오류",
    href: "/admin/logs?logType=ORDER_EVENT&errorOnly=1",
    description: "주문 파이프라인 이벤트 오류",
  },
  {
    label: "Jobs — 실패",
    href: "/admin/jobs?status=FAILED",
    description: "최근 실패한 Job 목록",
  },
  {
    label: "Jobs — 카탈로그 동기화 실패",
    href: "/admin/jobs?jobType=CATALOG_SYNC&status=FAILED",
    description: "CATALOG_SYNC 실패 Job",
  },
  {
    label: "Jobs — 주문 복구 재시도",
    href: "/admin/jobs?jobType=ORDER_RECOVERY_RETRY",
    description: "주문 복구 재시도 Job 현황",
  },
  {
    label: "Integrations",
    href: "/admin/integrations",
    description: "연동 연결 상태 전체 목록",
  },
  {
    label: "Billing — 연체 테넌트",
    href: "/admin/billing/tenants",
    description: "구독 상태 및 연체 테넌트 목록",
  },
  {
    label: "Billing Overview",
    href: "/admin/billing",
    description: "빌링 전체 개요",
  },
  {
    label: "Tenants",
    href: "/admin/tenants",
    description: "테넌트 전체 목록",
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
