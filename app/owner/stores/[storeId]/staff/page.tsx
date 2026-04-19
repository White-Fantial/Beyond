import { requireOwnerStoreAccess, resolveActorTenantId } from "@/services/owner/owner-authz.service";
import { listOwnerStoreStaff } from "@/services/owner/owner-staff.service";

interface Props {
  params: Promise<{ storeId: string }>;
}

const ROLE_BADGE: Record<string, { label: string; className: string }> = {
  OWNER: { label: "오너", className: "bg-purple-100 text-purple-700" },
  ADMIN: { label: "어드민", className: "bg-blue-100 text-blue-700" },
  MANAGER: { label: "매니저", className: "bg-indigo-100 text-indigo-700" },
  SUPERVISOR: { label: "슈퍼바이저", className: "bg-teal-100 text-teal-700" },
  STAFF: { label: "스태프", className: "bg-gray-100 text-gray-600" },
};

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  ACTIVE: { label: "Active", className: "bg-green-100 text-green-700" },
  INACTIVE: { label: "Inactive", className: "bg-gray-100 text-gray-500" },
  REMOVED: { label: "Delete됨", className: "bg-red-100 text-red-500" },
};

export default async function StoreStaffPage({ params }: Props) {
  const { storeId } = await params;
  const ctx = await requireOwnerStoreAccess(storeId);
  const tenantId = resolveActorTenantId(ctx, storeId);
  const staff = await listOwnerStoreStaff(storeId, tenantId);

  return (
    <div className="max-w-4xl mx-auto px-4 pb-10 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-gray-800">Staff</h2>
        <div className="text-xs text-gray-400">
          Invite Staff/Edit: POST /api/owner/stores/{storeId}/staff
        </div>
      </div>

      {staff.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
          <p className="text-gray-400 text-sm">No staff members registered.</p>
          <p className="text-xs text-gray-400 mt-2">
            API를 통해 직원을 초대할 수 있습니다.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">Name</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">Email</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">Tenant Role</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">Store Role</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {staff.map((s) => {
                  const roleBadge = ROLE_BADGE[s.storeRole] ?? { label: s.storeRole, className: "bg-gray-100 text-gray-600" };
                  const statusBadge = STATUS_BADGE[s.status] ?? { label: s.status, className: "bg-gray-100 text-gray-500" };
                  return (
                    <tr key={s.storeMembershipId} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">{s.name}</div>
                        {s.isPrimaryStoreOwner && (
                          <div className="text-xs text-purple-600 mt-0.5">Primary Owner</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-600">{s.email}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded ${ROLE_BADGE[s.tenantMembershipRole]?.className ?? "bg-gray-100 text-gray-600"}`}>
                          {ROLE_BADGE[s.tenantMembershipRole]?.label ?? s.tenantMembershipRole}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded ${roleBadge.className}`}>
                          {roleBadge.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded ${statusBadge.className}`}>
                          {statusBadge.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-xs text-blue-700">
        <p className="font-semibold mb-1">Staff Management API</p>
        <ul className="space-y-1 list-disc list-inside">
          <li>POST /api/owner/stores/{storeId}/staff — Invite Staff</li>
          <li>PATCH /api/owner/stores/{storeId}/staff/[membershipId] — Change Role / Status</li>
          <li>DELETE /api/owner/stores/{storeId}/staff/[membershipId] — Remove Staff</li>
        </ul>
      </div>
    </div>
  );
}
