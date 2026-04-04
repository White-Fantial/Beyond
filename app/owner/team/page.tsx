import { requireOwnerPortalAccess } from "@/lib/owner/auth-guard";
import { listOwnerTeamMembers } from "@/services/owner/owner-team.service";
import TeamMembersClient from "./TeamMembersClient";

function KpiCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="text-2xl font-bold text-gray-900 mt-1">{value}</div>
    </div>
  );
}

export default async function OwnerTeamPage() {
  const ctx = await requireOwnerPortalAccess();
  const tenantId = ctx.tenantMemberships[0]?.tenantId ?? "";

  const members = await listOwnerTeamMembers(tenantId);

  const total = members.length;
  const active = members.filter((m) => m.status === "ACTIVE").length;
  const invited = members.filter((m) => m.status === "INVITED").length;
  const inactive = members.filter((m) => m.status === "INACTIVE").length;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Team Management</h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage your tenant team members, roles, and access across all stores.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <KpiCard label="Total Members" value={total} />
        <KpiCard label="Active" value={active} />
        <KpiCard label="Invited" value={invited} />
        <KpiCard label="Inactive" value={inactive} />
      </div>

      <TeamMembersClient initialMembers={members} tenantId={tenantId} />
    </div>
  );
}
