interface AdminLogEmptyStateProps {
  hasFilters: boolean;
}

export default function AdminLogEmptyState({ hasFilters }: AdminLogEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center text-gray-500">
      <div className="text-4xl mb-3">📋</div>
      <p className="text-sm font-medium">
        {hasFilters ? "조에 맞는 No logs found." : "No logs found."}
      </p>
      {hasFilters && (
        <p className="text-xs mt-1 text-gray-400">Try adjusting or resetting the filters.</p>
      )}
    </div>
  );
}
