import Link from "next/link";
import { notFound } from "next/navigation";
import { requireOwnerPortalAccess } from "@/lib/owner/auth-guard";
import { getOwnerTeamMember } from "@/services/owner/owner-team.service";

interface Props {
  params: { membershipId: string };
}

const ROLE_BADGE: Record<string, { label: string; className: string }> = {
  OWNER: { label: "Owner", className: "bg-purple-100 text-purple-700" },
  ADMIN: { label: "Admin", className: "bg-blue-100 text-blue-700" },
  MANAGER: { label: "Manager", className: "bg-indigo-100 text-indigo-700" },
  SUPERVISOR: { label: "Supervisor", className: "bg-teal-100 text-teal-700" },
  STAFF: { label: "Staff", className: "bg-gray-100 text-gray-600" },
  ANALYST: { label: "Analyst", className: "bg-orange-100 text-orange-600" },
};

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  ACTIVE: { label: "Active", className: "bg-green-100 text-green-700" },
  INVITED: { label: "Invited", className: "bg-yellow-100 text-yellow-700" },
  INACTIVE: { label: "Inactive", className: "bg-gray-100 text-gray-500" },
  REMOVED: { label: "Removed", className: "bg-red-100 text-red-500" },
};

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-NZ", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default async function TeamMemberDetailPage({ params }: Props) {
  const { membershipId } = params;
  const ctx = await requireOwnerPortalAccess();
  const tenantId = ctx.tenantMemberships[0]?.tenantId ?? "";

  const member = await getOwnerTeamMember(membershipId, tenantId);
  if (!member) notFound();

  const roleBadge = ROLE_BADGE[member.role] ?? { label: member.role, className: "bg-gray-100 text-gray-600" };
  const statusBadge = STATUS_BADGE[member.status] ?? { label: member.status, className: "bg-gray-100 text-gray-500" };

  return (
    <div className="max-w-3xl">
      {/* Back link */}
      <div className="mb-4">
        <Link href="/owner/team" className="text-sm text-brand-600 hover:text-brand-800">
          ← Back to Team
        </Link>
      </div>

      {/* Member info card */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-lg font-semibold text-gray-900">{member.name}</h1>
            <p className="text-sm text-gray-500 mt-0.5">{member.email}</p>
          </div>
          <div className="flex gap-2">
            <span className={`text-xs font-medium px-2 py-1 rounded ${roleBadge.className}`}>
              {roleBadge.label}
            </span>
            <span className={`text-xs font-medium px-2 py-1 rounded ${statusBadge.className}`}>
              {statusBadge.label}
            </span>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-500">Joined</span>
            <div className="font-medium text-gray-900 mt-0.5">{formatDate(member.joinedAt)}</div>
          </div>
          <div>
            <span className="text-gray-500">Invited</span>
            <div className="font-medium text-gray-900 mt-0.5">{formatDate(member.invitedAt)}</div>
          </div>
        </div>
      </div>

      {/* Store assignments */}
      <div>
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Store Assignments</h2>
        {member.storeAssignments.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-6 text-center">
            <p className="text-sm text-gray-500">No store assignments.</p>
            <p className="text-xs text-gray-400 mt-1">
              Assign this member to stores via the per-store staff pages.
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">Store</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">Store Role</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {member.storeAssignments.map((sa) => {
                  const srBadge = ROLE_BADGE[sa.storeRole] ?? { label: sa.storeRole, className: "bg-gray-100 text-gray-600" };
                  const ssBadge = STATUS_BADGE[sa.status] ?? { label: sa.status, className: "bg-gray-100 text-gray-500" };
                  return (
                    <tr key={sa.storeMembershipId} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">{sa.storeName}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded ${srBadge.className}`}>
                          {srBadge.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded ${ssBadge.className}`}>
                          {ssBadge.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
