import { labelFlagType, labelFlagStatus } from "@/lib/flags/labels";
import type { AdminFeatureFlagDetail } from "@/types/feature-flags";

interface Props {
  flag: AdminFeatureFlagDetail;
}

export default function AdminFeatureFlagContextSummary({ flag }: Props) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-5 space-y-3">
      <h2 className="text-sm font-semibold text-gray-700 mb-2">Flag 정보</h2>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        <dt className="text-gray-500">Key</dt>
        <dd className="font-mono text-gray-800 break-all">{flag.key}</dd>
        <dt className="text-gray-500">타입</dt>
        <dd>{labelFlagType(flag.flagType)}</dd>
        <dt className="text-gray-500">상태</dt>
        <dd>{labelFlagStatus(flag.status)}</dd>
        <dt className="text-gray-500">실험</dt>
        <dd>{flag.isExperiment ? "예" : "아니오"}</dd>
        {flag.defaultBoolValue !== null && flag.defaultBoolValue !== undefined && (
          <>
            <dt className="text-gray-500">기본값(Bool)</dt>
            <dd>{String(flag.defaultBoolValue)}</dd>
          </>
        )}
        {flag.defaultStringValue && (
          <>
            <dt className="text-gray-500">기본값(String)</dt>
            <dd className="truncate">{flag.defaultStringValue}</dd>
          </>
        )}
        {flag.defaultIntValue !== null && flag.defaultIntValue !== undefined && (
          <>
            <dt className="text-gray-500">기본값(Int)</dt>
            <dd>{flag.defaultIntValue}</dd>
          </>
        )}
        {flag.ownerNote && (
          <>
            <dt className="text-gray-500">노트</dt>
            <dd className="text-gray-600 col-span-1">{flag.ownerNote}</dd>
          </>
        )}
        <dt className="text-gray-500">생성일</dt>
        <dd className="text-gray-500 text-xs">{flag.createdAt.toLocaleString("ko-KR")}</dd>
        <dt className="text-gray-500">수정일</dt>
        <dd className="text-gray-500 text-xs">{flag.updatedAt.toLocaleString("ko-KR")}</dd>
      </dl>
    </div>
  );
}
