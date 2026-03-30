import { requirePermission } from "@/lib/auth/permissions";
import { PERMISSIONS } from "@/lib/auth/constants";

export default async function OwnerBillingPage() {
  await requirePermission(PERMISSIONS.BILLING);
  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 mb-4">결제 / 구독 관리</h1>
      <p className="text-gray-500">현재 플랜 정보가 없습니다.</p>
    </div>
  );
}
