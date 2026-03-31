import { requireStorePermission } from "@/lib/auth/permissions";
import { PERMISSIONS } from "@/lib/auth/constants";
import { listProductsGroupedByCategory } from "@/services/catalog.service";
import Link from "next/link";

export default async function BackofficeOperationsPage({
  params,
}: {
  params: Promise<{ storeId: string }>;
}) {
  const { storeId } = await params;
  await requireStorePermission(storeId, PERMISSIONS.OPERATIONS);

  const groups = await listProductsGroupedByCategory(storeId);

  const totalProducts = groups.reduce((sum, g) => sum + g.products.length, 0);
  const soldOutProducts = groups.reduce(
    (sum, g) => sum + g.products.filter((p) => p.isSoldOut).length,
    0
  );
  const affectedCategories = groups.filter((g) => g.products.some((p) => p.isSoldOut)).length;

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 mb-1">운영 관리</h1>
      <p className="text-sm text-gray-500 mb-6">오늘의 운영 현황입니다.</p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 mb-8">
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide">전체 상품</p>
          <p className="mt-1 text-3xl font-bold text-gray-900">{totalProducts}</p>
        </div>
        <div
          className={`rounded-lg border p-4 ${
            soldOutProducts > 0
              ? "border-red-200 bg-red-50"
              : "border-gray-200 bg-white"
          }`}
        >
          <p className="text-xs text-gray-500 uppercase tracking-wide">품절 상품</p>
          <p
            className={`mt-1 text-3xl font-bold ${
              soldOutProducts > 0 ? "text-red-700" : "text-gray-900"
            }`}
          >
            {soldOutProducts}
          </p>
        </div>
        <div
          className={`rounded-lg border p-4 ${
            affectedCategories > 0
              ? "border-orange-200 bg-orange-50"
              : "border-gray-200 bg-white"
          }`}
        >
          <p className="text-xs text-gray-500 uppercase tracking-wide">영향 받는 카테고리</p>
          <p
            className={`mt-1 text-3xl font-bold ${
              affectedCategories > 0 ? "text-orange-700" : "text-gray-900"
            }`}
          >
            {affectedCategories}
          </p>
        </div>
      </div>

      {soldOutProducts > 0 ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 mb-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-semibold text-red-800 mb-1">품절 상품이 있습니다</p>
              <ul className="space-y-0.5">
                {groups
                  .filter((g) => g.products.some((p) => p.isSoldOut))
                  .map((g) => {
                    const soldOut = g.products.filter((p) => p.isSoldOut);
                    return (
                      <li key={g.categoryId} className="text-sm text-red-700">
                        <span className="font-medium">{g.categoryName}</span>:{" "}
                        {soldOut.map((p) => p.onlineName ?? p.name).join(", ")}
                      </li>
                    );
                  })}
              </ul>
            </div>
            <Link
              href={`/backoffice/store/${storeId}/inventory`}
              className="ml-4 shrink-0 rounded bg-red-100 px-3 py-1.5 text-xs font-semibold text-red-800 hover:bg-red-200"
            >
              재고 관리 →
            </Link>
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4 mb-6">
          <p className="font-semibold text-green-800">모든 상품이 정상 판매 중입니다.</p>
        </div>
      )}
    </div>
  );
}
