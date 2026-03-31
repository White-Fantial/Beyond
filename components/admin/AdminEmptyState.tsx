interface AdminEmptyStateProps {
  message?: string;
}

export default function AdminEmptyState({
  message = "표시할 데이터가 없습니다.",
}: AdminEmptyStateProps) {
  return (
    <div className="py-12 text-center">
      <p className="text-sm text-gray-400">{message}</p>
    </div>
  );
}
