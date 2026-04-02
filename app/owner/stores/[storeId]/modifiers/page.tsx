import { requireOwnerStoreAccess } from "@/services/owner/owner-authz.service";
import { listOwnerModifierGroups } from "@/services/owner/owner-catalog.service";

interface Props {
  params: { storeId: string };
}

export default async function StoreModifiersPage({ params }: Props) {
  const { storeId } = params;
  await requireOwnerStoreAccess(storeId);
  const groups = await listOwnerModifierGroups(storeId);

  return (
    <div className="max-w-4xl mx-auto px-4 pb-10 space-y-4">
      <div>
        <h2 className="text-base font-semibold text-gray-800">옵션 그룹 목록</h2>
        <p className="text-xs text-gray-500 mt-0.5">
          * 옵션 품절 상태, 온라인 노출 설정만 수정 가능합니다. 옵션명·가격은 POS 기준 읽기 전용입니다.
        </p>
      </div>

      {groups.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-sm text-gray-400">
          옵션 그룹이 없습니다.
        </div>
      ) : (
        <div className="space-y-3">
          {groups.map((group) => (
            <div key={group.id} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-gray-800">{group.name}</span>
                  <span className="text-xs bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded">
                    {group.sourceType}
                  </span>
                  <span className="text-xs text-gray-400">순서 {group.displayOrder}</span>
                </div>
                <span className={`text-xs font-medium px-2 py-0.5 rounded ${group.isVisibleOnOnlineOrder ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-400"}`}>
                  온라인 {group.isVisibleOnOnlineOrder ? "노출" : "숨김"}
                </span>
              </div>
              <div className="divide-y divide-gray-100">
                {group.options.map((opt) => (
                  <div
                    key={opt.id}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm"
                  >
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${opt.isSoldOut ? "bg-red-400" : "bg-green-400"}`} />
                    <span className="flex-1 text-gray-800">{opt.name}</span>
                    <span className="text-gray-400 text-xs">🔒 {opt.priceDeltaAmount > 0 ? `+${opt.priceDeltaAmount / 100}` : opt.priceDeltaAmount < 0 ? `${opt.priceDeltaAmount / 100}` : "기본"}</span>
                    {opt.isSoldOut && (
                      <span className="text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded">품절</span>
                    )}
                    {opt.isDefault && (
                      <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">기본선택</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
      <p className="text-xs text-gray-400">
        옵션 수정 API: PATCH /api/owner/stores/{storeId}/modifier-options/[optionId]
      </p>
    </div>
  );
}
