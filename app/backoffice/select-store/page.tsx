import { requireAuth } from "@/lib/auth/permissions";
import Link from "next/link";
import { STORE_ROLE_REDIRECT_PATHS } from "@/lib/auth/constants";

export default async function SelectStorePage() {
  const ctx = await requireAuth();
  const memberships = ctx.storeMemberships;

  if (memberships.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="text-4xl mb-4">🏪</div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">배정된 매장 없음</h1>
          <p className="text-gray-500">관리자에게 매장 배정을 요청하세요.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">매장 선택</h1>
          <p className="text-gray-500 mt-2">작업할 매장을 선택하세요.</p>
        </div>
        <div className="space-y-3">
          {memberships.map((m) => {
            const path = STORE_ROLE_REDIRECT_PATHS[m.roleKey] ?? "orders";
            return (
              <Link
                key={m.storeId}
                href={`/backoffice/store/${m.storeId}/${path}`}
                className="block bg-white rounded-xl border border-gray-200 p-4 hover:shadow-sm hover:border-brand-300 transition"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-gray-900">🏪 {m.storeName}</div>
                    <div className="text-sm text-gray-500 mt-0.5">{m.roleKey}</div>
                  </div>
                  <span className="text-gray-400">→</span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
