import { requireOwnerPortalAccess } from "@/lib/owner/auth-guard";
import { getOwnerStores } from "@/services/owner/owner-store.service";
import { redirect } from "next/navigation";
import Link from "next/link";

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  ACTIVE: { label: "운영 중", className: "bg-green-100 text-green-700" },
  INACTIVE: { label: "비활성", className: "bg-gray-100 text-gray-500" },
  ARCHIVED: { label: "보관됨", className: "bg-gray-100 text-gray-400" },
};

export default async function OwnerStoresPage() {
  const ctx = await requireOwnerPortalAccess();
  const tenantId = ctx.tenantMemberships[0]?.tenantId ?? "";
  const stores = tenantId ? await getOwnerStores(tenantId) : [];

  if (stores.length === 1) {
    redirect(`/owner/stores/${stores[0].id}`);
  }

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      <h1 className="text-xl font-bold text-gray-900 mb-6">내 매장</h1>
      {stores.length === 0 ? (
        <p className="text-gray-500 text-sm">등록된 매장이 없습니다.</p>
      ) : (
        <div className="space-y-3">
          {stores.map((store) => {
            const badge = STATUS_BADGE[store.status] ?? { label: store.status, className: "bg-gray-100 text-gray-500" };
            return (
              <Link
                key={store.id}
                href={`/owner/stores/${store.id}`}
                className="block bg-white border border-gray-200 rounded-lg p-4 hover:border-brand-400 hover:shadow-sm transition-all"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-gray-900">{store.name}</div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {store.timezone} · {store.currency}
                    </div>
                  </div>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded ${badge.className}`}>
                    {badge.label}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
