import { requireStoreAccess } from "@/lib/auth/permissions";
import BackofficeSidebar from "@/components/layout/BackofficeSidebar";

export default async function BackofficeLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ storeId: string }>;
}) {
  const { storeId } = await params;
  const ctx = await requireStoreAccess(storeId);
  const membership = ctx.storeMemberships.find((m) => m.storeId === storeId);
  const storeRole = membership?.storeRole ?? "STAFF";
  const storeName = membership?.storeName ?? "매장";

  return (
    <div className="flex h-screen bg-gray-50">
      <BackofficeSidebar storeId={storeId} storeRole={storeRole} storeName={storeName} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div className="text-sm text-gray-500">🏪 {storeName}</div>
          <div className="text-sm font-medium text-gray-700">{ctx.name}</div>
        </header>
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </div>
  );
}
