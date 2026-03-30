import { requireStorePermission } from "@/lib/auth/permissions";
import { PERMISSIONS } from "@/lib/auth/constants";

export default async function BackofficeReportsPage({
  params,
}: {
  params: Promise<{ storeId: string }>;
}) {
  const { storeId } = await params;
  await requireStorePermission(storeId, PERMISSIONS.REPORTS);

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 mb-4">리포트</h1>
      <p className="text-gray-500">리포트 데이터가 없습니다.</p>
    </div>
  );
}
