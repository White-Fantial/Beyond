interface AdminLogEmptyStateProps {
  hasFilters: boolean;
}

export default function AdminLogEmptyState({ hasFilters }: AdminLogEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center text-gray-500">
      <div className="text-4xl mb-3">📋</div>
      <p className="text-sm font-medium">
        {hasFilters ? "조건에 맞는 로그가 없습니다." : "로그가 없습니다."}
      </p>
      {hasFilters && (
        <p className="text-xs mt-1 text-gray-400">필터를 조정하거나 초기화해 보세요.</p>
      )}
    </div>
  );
}
