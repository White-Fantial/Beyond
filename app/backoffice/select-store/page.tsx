import { requireAuth } from "@/lib/auth/permissions";
import Link from "next/link";

export default async function SelectStorePage() {
  const ctx = await requireAuth();
  const memberships = ctx.storeMemberships;

  if (memberships.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="text-4xl mb-4">🏪</div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">No Stores Assigned</h1>
          <p className="text-gray-500">Please contact your administrator to get store access.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Select a Store</h1>
          <p className="text-gray-500 mt-2">Choose a store to work in.</p>
        </div>
        <div className="space-y-3">
          {memberships.map((m) => (
            <Link
              key={m.storeId}
              href={`/backoffice/store/${m.storeId}/orders`}
              className="block bg-white rounded-xl border border-gray-200 p-4 hover:shadow-sm hover:border-brand-300 transition"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-gray-900">🏪 {m.storeName}</div>
                  <div className="text-sm text-gray-500 mt-0.5">{m.storeRole}</div>
                </div>
                <span className="text-gray-400">→</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
