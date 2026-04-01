import Link from "next/link";
import type { AdminJobRunDetail } from "@/types/admin-jobs";

interface AdminJobContextLinksProps {
  run: AdminJobRunDetail;
}

export default function AdminJobContextLinks({ run }: AdminJobContextLinksProps) {
  const links: { label: string; href: string }[] = [];

  if (run.tenantId) {
    links.push({ label: `Tenant: ${run.tenantName ?? run.tenantId}`, href: `/admin/tenants/${run.tenantId}` });
    links.push({ label: "이 tenant 의 모든 Jobs", href: `/admin/jobs?tenantId=${run.tenantId}` });
  }

  if (run.storeId) {
    links.push({ label: `Store: ${run.storeName ?? run.storeId}`, href: `/admin/stores/${run.storeId}` });
    links.push({ label: "이 store 의 모든 Jobs", href: `/admin/jobs?storeId=${run.storeId}` });
  }

  if (run.provider) {
    links.push({ label: `${run.provider} Jobs 보기`, href: `/admin/jobs?provider=${run.provider}` });
  }

  if (run.parentRunId) {
    links.push({ label: "원본 Run (Parent)", href: `/admin/jobs/${run.parentRunId}` });
  }

  if (run.childRuns.length > 0) {
    links.push({ label: `Retry Runs (${run.childRuns.length}건)`, href: `/admin/jobs/${run.childRuns[run.childRuns.length - 1].id}` });
  }

  // Link to audit logs for this job run
  links.push({ label: "관련 Audit 로그 보기", href: `/admin/logs?targetId=${run.id}` });

  if (links.length === 0) return null;

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
      <h2 className="text-sm font-semibold text-gray-700 mb-3">관련 링크</h2>
      <div className="flex flex-wrap gap-2">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="text-xs text-blue-600 hover:underline border border-blue-100 bg-blue-50 rounded px-2 py-1"
          >
            {link.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
