interface AdminEmptyStateProps {
  message?: string;
}

export default function AdminEmptyState({
  message = "No data available.",
}: AdminEmptyStateProps) {
  return (
    <div className="py-12 text-center">
      <p className="text-sm text-gray-400">{message}</p>
    </div>
  );
}
