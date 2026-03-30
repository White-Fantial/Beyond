import { requirePermission } from "@/lib/auth/permissions";
import { PERMISSIONS } from "@/lib/auth/constants";

export default async function CustomerSubscriptionsPage() {
  await requirePermission(PERMISSIONS.CUSTOMER_APP);
  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 mb-4">구독 관리</h1>
      <p className="text-gray-500">활성 구독이 없습니다.</p>
    </div>
  );
}
