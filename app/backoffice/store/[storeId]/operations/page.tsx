import { requireStorePermission } from "@/lib/auth/permissions";
import { PERMISSIONS } from "@/lib/auth/constants";

export default async function BackofficeOperationsPage({
  params,
}: {
  params: Promise<{ storeId: string }>;
}) {
  const { storeId } = await params;
  await requireStorePermission(storeId, PERMISSIONS.OPERATIONS);

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 mb-4">운영 관리</h1>
      <p className="text-gray-500">오늘의 운영 현황입니다.</p>
    </div>
  );
}
