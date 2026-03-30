import { requirePermission } from "@/lib/auth/permissions";
import { PERMISSIONS } from "@/lib/auth/constants";

export default async function CustomerAccountPage() {
  const ctx = await requirePermission(PERMISSIONS.CUSTOMER_APP);
  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 mb-4">내 계정</h1>
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="text-sm text-gray-500">이름</div>
        <div className="font-medium">{ctx.name}</div>
        <div className="text-sm text-gray-500 mt-3">이메일</div>
        <div className="font-medium">{ctx.email}</div>
      </div>
    </div>
  );
}
