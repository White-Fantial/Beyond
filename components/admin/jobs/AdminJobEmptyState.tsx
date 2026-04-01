interface AdminJobEmptyStateProps {
  hasFilters?: boolean;
}

export default function AdminJobEmptyState({ hasFilters }: AdminJobEmptyStateProps) {
  return (
    <div className="py-16 text-center border border-gray-200 rounded-lg bg-white">
      <div className="text-3xl mb-3">⚙️</div>
      <p className="text-sm font-medium text-gray-600">
        {hasFilters ? "No jobs found matching the current filters." : "No jobs found."}
      </p>
      {!hasFilters && (
        <p className="text-xs text-gray-400 mt-1">
          Use the Manual Run button to trigger a job, or adjust your filters.
        </p>
      )}
    </div>
  );
}
