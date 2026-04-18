import { requirePlatformAdmin } from "@/lib/admin/auth-guard";
import { getCurrentUserAuthContext } from "@/lib/auth/context";
import { listMarketplaceRecipes } from "@/services/marketplace/recipe-marketplace.service";
import { MARKETPLACE_RECIPE_STATUS_LABELS } from "@/types/marketplace";
import Link from "next/link";

export default async function AdminMarketplaceRecipesPage() {
  await requirePlatformAdmin();
  const ctx = await getCurrentUserAuthContext();

  const isModOrAdmin = ctx?.isPlatformAdmin || ctx?.isPlatformModerator;
  if (!isModOrAdmin) {
    // Fallback guard (middleware should catch this first)
    return <div>접근 권한이 없습니다.</div>;
  }

  const result = await listMarketplaceRecipes({ pageSize: 100 });

  const statusColors: Record<string, string> = {
    DRAFT: "bg-gray-100 text-gray-600",
    PENDING_REVIEW: "bg-blue-100 text-blue-700",
    CHANGE_REQUESTED: "bg-yellow-100 text-yellow-700",
    APPROVED: "bg-teal-100 text-teal-700",
    PUBLISHED: "bg-green-100 text-green-700",
    REJECTED: "bg-red-100 text-red-700",
    ARCHIVED: "bg-gray-100 text-gray-400",
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">마켓플레이스 레시피</h1>
          <p className="text-sm text-gray-500 mt-0.5">전체 {result.total}개</p>
        </div>
        <Link
          href="/admin/marketplace/recipes/pending"
          className="text-sm text-blue-600 hover:underline"
        >
          검토 대기 →
        </Link>
      </div>

      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-gray-500">레시피</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">유형</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">상태</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500 hidden md:table-cell">제공자</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500 hidden sm:table-cell">가격</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500 hidden lg:table-cell">등록일</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {result.items.map((r) => (
              <tr key={r.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <p className="font-medium text-gray-900">{r.title}</p>
                  {r.cuisineTag && (
                    <p className="text-xs text-gray-400">{r.cuisineTag}</p>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                      r.type === "BASIC"
                        ? "bg-green-100 text-green-700"
                        : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    {r.type === "BASIC" ? "기본" : "프리미엄"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                      statusColors[r.status] ?? "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {MARKETPLACE_RECIPE_STATUS_LABELS[r.status]}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-500 hidden md:table-cell">
                  {r.providerName ?? "—"}
                </td>
                <td className="px-4 py-3 text-gray-600 hidden sm:table-cell">
                  {r.type === "BASIC"
                    ? "무료"
                    : `${r.salePrice.toLocaleString("ko-KR")}원`}
                </td>
                <td className="px-4 py-3 text-gray-400 text-xs hidden lg:table-cell">
                  {new Date(r.createdAt).toLocaleDateString("ko-KR")}
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/marketplace/${r.id}`}
                    className="text-xs text-blue-600 hover:underline"
                  >
                    보기
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
