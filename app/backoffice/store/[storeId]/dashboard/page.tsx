import { requireStoreAccess } from "@/lib/auth/permissions";

export default async function BackofficeDashboardPage({
  params,
}: {
  params: Promise<{ storeId: string }>;
}) {
  const { storeId } = await params;
  await requireStoreAccess(storeId);

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 mb-4">Store Dashboard</h1>
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-sm text-gray-500">Today&apos;s Orders</div>
          <div className="text-2xl font-bold text-gray-900 mt-1">—</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-sm text-gray-500">Today&apos;s Revenue</div>
          <div className="text-2xl font-bold text-gray-900 mt-1">—</div>
        </div>
      </div>
    </div>
  );
}
