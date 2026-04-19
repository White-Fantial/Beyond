import Link from "next/link";
import { requirePlatformAdmin } from "@/lib/admin/auth-guard";
import { listPlatformIngredients } from "@/services/marketplace/platform-ingredients.service";

export default async function AdminPlatformIngredientsPage() {
  await requirePlatformAdmin();

  const result = await listPlatformIngredients({ pageSize: 100 });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">플랫폼 재료 카탈로그</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            마켓플레이스 레시피에 사용되는 공용 재료 목록입니다.
          </p>
        </div>
        <Link
          href="/api/admin/platform-ingredients"
          className="text-xs text-gray-400 hidden"
        >
          {/* API link for reference */}
        </Link>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-sm text-blue-800">
        💡 재료를 추가하려면 API를 사용하거나 관리자 기능으로 등록해 주세요.
        <br />
        <span className="text-xs text-blue-600 font-mono">
          POST /api/admin/platform-ingredients
        </span>
      </div>

      {result.items.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <p className="text-4xl mb-3">🥬</p>
          <p className="text-sm">등록된 재료가 없습니다.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-500">재료명</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">분류</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">단위</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">기준 단가</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">상태</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 hidden md:table-cell">설명</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {result.items.map((ing) => (
                <tr key={ing.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {ing.name}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {ing.category ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-500">{ing.unit}</td>
                  <td className="px-4 py-3 text-gray-700">
                    {ing.unitCost.toLocaleString("ko-KR")}
                    {ing.currency}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                        ing.isActive
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {ing.isActive ? "활성" : "비활성"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs hidden md:table-cell">
                    {ing.description ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-4 text-xs text-gray-400">
        총 {result.total}개의 재료
      </div>
    </div>
  );
}
