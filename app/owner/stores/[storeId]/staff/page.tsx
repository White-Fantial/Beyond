import { requireOwnerStoreAccess, resolveActorTenantId } from "@/services/owner/owner-authz.service";
import { listOwnerStoreStaff } from "@/services/owner/owner-staff.service";

interface Props {
  params: { storeId: string };
}

const ROLE_BADGE: Record<string, { label: string; className: string }> = {
  OWNER: { label: "오너", className: "bg-purple-100 text-purple-700" },
  ADMIN: { label: "어드민", className: "bg-blue-100 text-blue-700" },
  MANAGER: { label: "매니저", className: "bg-indigo-100 text-indigo-700" },
  SUPERVISOR: { label: "슈퍼바이저", className: "bg-teal-100 text-teal-700" },
  STAFF: { label: "스태프", className: "bg-gray-100 text-gray-600" },
};

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  ACTIVE: { label: "활성", className: "bg-green-100 text-green-700" },
  INACTIVE: { label: "비활성", className: "bg-gray-100 text-gray-500" },
  REMOVED: { label: "삭제됨", className: "bg-red-100 text-red-500" },
};

export default async function StoreStaffPage({ params }: Props) {
  const { storeId } = params;
  const ctx = await requireOwnerStoreAccess(storeId);
  const tenantId = resolveActorTenantId(ctx, storeId);
  const staff = await listOwnerStoreStaff(storeId, tenantId);

  return (
    <div className="max-w-4xl mx-auto px-4 pb-10 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-gray-800">직원 목록</h2>
        <div className="text-xs text-gray-400">
          직원 초대/수정: POST /api/owner/stores/{storeId}/staff
        </div>
      </div>

      {staff.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
          <p className="text-gray-400 text-sm">등록된 직원이 없습니다.</p>
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
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">이름</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">이메일</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">테넌트 역할</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">매장 역할</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">상태</th>
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
                          <div className="text-xs text-purple-600 mt-0.5">주 오너</div>
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
        <p className="font-semibold mb-1">직원 관리 API</p>
        <ul className="space-y-1 list-disc list-inside">
          <li>POST /api/owner/stores/{storeId}/staff — 직원 초대</li>
          <li>PATCH /api/owner/stores/{storeId}/staff/[membershipId] — 역할 변경 / 상태 변경</li>
          <li>DELETE /api/owner/stores/{storeId}/staff/[membershipId] — 직원 제거</li>
        </ul>
      </div>
    </div>
  );
}
