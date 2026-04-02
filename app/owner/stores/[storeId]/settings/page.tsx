import { requireOwnerStoreAccess, resolveActorTenantId } from "@/services/owner/owner-authz.service";
import { getOwnerStoreSettings } from "@/services/owner/owner-settings.service";

interface Props {
  params: { storeId: string };
}

const DAY_NAMES = ["일", "월", "화", "수", "목", "금", "토"];

export default async function StoreSettingsPage({ params }: Props) {
  const { storeId } = params;
  const ctx = await requireOwnerStoreAccess(storeId);
  const tenantId = resolveActorTenantId(ctx, storeId);
  const settings = await getOwnerStoreSettings(storeId);

  return (
    <div className="max-w-2xl mx-auto px-4 pb-10 space-y-6">
      {/* Basic Info */}
      <section className="bg-white rounded-lg border border-gray-200 p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">기본 정보</h2>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
          <div>
            <dt className="text-xs text-gray-500">매장명</dt>
            <dd className="mt-0.5 text-gray-900 font-medium">{settings.store.name}</dd>
          </div>
          <div>
            <dt className="text-xs text-gray-500">표시명</dt>
            <dd className="mt-0.5 text-gray-900">{settings.store.displayName}</dd>
          </div>
          <div>
            <dt className="text-xs text-gray-500">전화</dt>
            <dd className="mt-0.5 text-gray-900">{settings.store.phone ?? "-"}</dd>
          </div>
          <div>
            <dt className="text-xs text-gray-500">이메일</dt>
            <dd className="mt-0.5 text-gray-900">{settings.store.email ?? "-"}</dd>
          </div>
          <div>
            <dt className="text-xs text-gray-500">주소</dt>
            <dd className="mt-0.5 text-gray-900">
              {[settings.store.addressLine1, settings.store.city, settings.store.region]
                .filter(Boolean)
                .join(", ") || "-"}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-gray-500">시간대 / 통화</dt>
            <dd className="mt-0.5 text-gray-900">
              {settings.store.timezone} / {settings.store.currency}
            </dd>
          </div>
        </dl>
        <p className="mt-4 text-xs text-gray-400 italic">
          기본 정보 수정 기능은 API를 통해 제공됩니다. (POST /api/owner/stores/{storeId}/settings)
        </p>
      </section>

      {/* Operation Settings */}
      {settings.operationSettings && (
        <section className="bg-white rounded-lg border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">운영 설정</h2>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
            <div>
              <dt className="text-xs text-gray-500">매장 오픈</dt>
              <dd className="mt-0.5">
                <span className={`text-xs px-2 py-0.5 rounded font-medium ${settings.operationSettings.storeOpen ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                  {settings.operationSettings.storeOpen ? "오픈" : "마감"}
                </span>
              </dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500">홀리데이 모드</dt>
              <dd className="mt-0.5">
                <span className={`text-xs px-2 py-0.5 rounded font-medium ${settings.operationSettings.holidayMode ? "bg-yellow-100 text-yellow-700" : "bg-gray-100 text-gray-500"}`}>
                  {settings.operationSettings.holidayMode ? "ON" : "OFF"}
                </span>
              </dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500">픽업 슬롯 간격</dt>
              <dd className="mt-0.5 text-gray-900">{settings.operationSettings.pickupIntervalMinutes}분</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500">최소 준비 시간</dt>
              <dd className="mt-0.5 text-gray-900">{settings.operationSettings.minPrepTimeMinutes}분</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500">슬롯당 최대 주문</dt>
              <dd className="mt-0.5 text-gray-900">{settings.operationSettings.maxOrdersPerSlot}건</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500">당일 주문 허용</dt>
              <dd className="mt-0.5 text-gray-900">
                {settings.operationSettings.allowSameDayOrders ? "허용" : "불허"}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500">구독 서비스</dt>
              <dd className="mt-0.5">
                <span className={`text-xs px-2 py-0.5 rounded font-medium ${settings.operationSettings.subscriptionEnabled ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                  {settings.operationSettings.subscriptionEnabled ? "활성" : "비활성"}
                </span>
              </dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500">품절 리셋 모드</dt>
              <dd className="mt-0.5 text-gray-900">{settings.operationSettings.soldOutResetMode}</dd>
            </div>
          </dl>
          <p className="mt-4 text-xs text-gray-400 italic">
            운영 설정 수정: PATCH /api/owner/stores/{storeId}/settings/operations
          </p>
        </section>
      )}

      {/* Store Hours */}
      <section className="bg-white rounded-lg border border-gray-200 p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">영업시간</h2>
        <div className="space-y-2">
          {settings.hours.map((h) => (
            <div key={h.dayOfWeek} className="flex items-center gap-3 text-sm">
              <span className="w-5 text-center font-medium text-gray-600">{DAY_NAMES[h.dayOfWeek]}</span>
              {h.isOpen ? (
                <span className="text-gray-800">
                  {h.openTimeLocal} ~ {h.closeTimeLocal}
                  {h.pickupStartTimeLocal && (
                    <span className="text-gray-400 ml-2">
                      (픽업: {h.pickupStartTimeLocal}~{h.pickupEndTimeLocal})
                    </span>
                  )}
                </span>
              ) : (
                <span className="text-gray-400">휴무</span>
              )}
            </div>
          ))}
        </div>
        <p className="mt-4 text-xs text-gray-400 italic">
          영업시간 수정: PUT /api/owner/stores/{storeId}/hours
        </p>
      </section>
    </div>
  );
}
