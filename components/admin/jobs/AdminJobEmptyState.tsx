interface AdminJobEmptyStateProps {
  hasFilters?: boolean;
}

export default function AdminJobEmptyState({ hasFilters }: AdminJobEmptyStateProps) {
  return (
    <div className="py-16 text-center border border-gray-200 rounded-lg bg-white">
      <div className="text-3xl mb-3">⚙️</div>
      <p className="text-sm font-medium text-gray-600">
        {hasFilters ? "조건에 맞는 작업 실행 기록이 없습니다." : "작업 실행 기록이 없습니다."}
      </p>
      {!hasFilters && (
        <p className="text-xs text-gray-400 mt-1">
          Manual Run 버튼으로 작업을 직접 실행하거나 필터를 조정해 보세요.
        </p>
      )}
    </div>
  );
}
