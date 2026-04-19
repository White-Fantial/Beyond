import { notFound } from "next/navigation";
import Link from "next/link";
import { requirePlatformAdmin } from "@/lib/admin/auth-guard";
import { getAdminFeatureFlagByKey } from "@/services/admin/admin-feature-flag.service";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import AdminFeatureFlagStatusBadge from "@/components/admin/feature-flags/AdminFeatureFlagStatusBadge";
import AdminFeatureFlagContextSummary from "@/components/admin/feature-flags/AdminFeatureFlagContextSummary";
import AdminFeatureFlagAssignmentTable from "@/components/admin/feature-flags/AdminFeatureFlagAssignmentTable";
import AdminFeatureFlagAssignmentDialog from "@/components/admin/feature-flags/AdminFeatureFlagAssignmentDialog";
import AdminFeatureFlagStatusChangeForm from "@/components/admin/feature-flags/AdminFeatureFlagStatusChangeForm";
import AdminFeatureFlagAuditList from "@/components/admin/feature-flags/AdminFeatureFlagAuditList";

interface Props {
  params: Promise<{ flagKey: string }>;
}

export default async function AdminFeatureFlagDetailPage({ params }: Props) {
  const { flagKey } = await params;
  await requirePlatformAdmin();
  const flag = await getAdminFeatureFlagByKey(flagKey);
  if (!flag) notFound();

  return (
    <div>
      {/* Breadcrumb */}
      <div className="text-xs text-gray-400 mb-4">
        <Link href="/admin/feature-flags" className="hover:text-gray-600">
          Feature Flags
        </Link>
        {" / "}
        <span className="font-mono text-gray-600">{flag.key}</span>
      </div>

      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <AdminPageHeader title={flag.name} description={flag.description ?? undefined} />
            <div className="shrink-0 pt-1">
              <AdminFeatureFlagStatusBadge status={flag.status} />
            </div>
          </div>
        </div>
        <div className="shrink-0 pt-1">
          <AdminFeatureFlagStatusChangeForm
            flagKey={flag.key}
            currentStatus={flag.status}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left: detail info + audit */}
        <div className="md:col-span-1 space-y-4">
          <AdminFeatureFlagContextSummary flag={flag} />

          <div className="bg-white rounded-lg border border-gray-200 p-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">Change History</h2>
            <AdminFeatureFlagAuditList flagId={flag.id} />
          </div>
        </div>

        {/* Right: assignments */}
        <div className="md:col-span-2">
          <div className="bg-white rounded-lg border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-gray-700">
                Assignments
                <span className="ml-2 text-xs text-gray-400">
                  ({flag.activeAssignmentCount} active / {flag.assignmentCount} total)
                </span>
              </h2>
              <AdminFeatureFlagAssignmentDialog
                flagKey={flag.key}
                flagType={flag.flagType}
              />
            </div>
            <AdminFeatureFlagAssignmentTable
              assignments={flag.assignments}
              flagKey={flag.key}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
