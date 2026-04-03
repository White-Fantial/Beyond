import Link from "next/link";

export function relativeDate(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-NZ");
}

interface PaginationProps {
  page: number;
  total: number;
  pageSize: number;
  buildUrl: (page: number) => string;
}

export function TablePagination({ page, total, pageSize, buildUrl }: PaginationProps) {
  const totalPages = Math.ceil(total / pageSize);
  if (totalPages <= 1) return null;
  return (
    <div className="border-t border-gray-200 px-4 py-3 flex items-center justify-between bg-gray-50">
      <span className="text-xs text-gray-500">
        Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total}
      </span>
      <div className="flex items-center gap-2">
        {page > 1 && (
          <Link
            href={buildUrl(page - 1)}
            className="px-3 py-1.5 text-xs border border-gray-200 rounded hover:bg-white text-gray-700"
          >
            ← Prev
          </Link>
        )}
        <span className="text-xs text-gray-500">
          Page {page} of {totalPages}
        </span>
        {page < totalPages && (
          <Link
            href={buildUrl(page + 1)}
            className="px-3 py-1.5 text-xs border border-gray-200 rounded hover:bg-white text-gray-700"
          >
            Next →
          </Link>
        )}
      </div>
    </div>
  );
}
