import Link from "next/link";
import type { IntegrationChangeEvent } from "@/types/owner-activity";
import ActivityEventBadge from "./ActivityEventBadge";

function relativeDate(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-NZ");
}

interface PaginationProps {
  page: number;
  total: number;
  pageSize: number;
  buildUrl: (page: number) => string;
}

function Pagination({ page, total, pageSize, buildUrl }: PaginationProps) {
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
        <span className="text-xs text-gray-500">Page {page} of {totalPages}</span>
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

interface Props {
  items: IntegrationChangeEvent[];
  total: number;
  page: number;
  pageSize: number;
  buildUrl: (page: number) => string;
}

export default function IntegrationChangeTable({ items, total, page, pageSize, buildUrl }: Props) {
  if (items.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-10 text-center">
        <p className="text-sm font-medium text-gray-700">No integration changes found</p>
        <p className="text-xs text-gray-400 mt-1">Try adjusting your filters.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">Event</th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">Provider</th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">Actor</th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">Store</th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">
                Connection
              </th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">When</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {items.map((item) => (
              <tr key={item.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <ActivityEventBadge action={item.action} />
                </td>
                <td className="px-4 py-3 text-xs font-medium text-gray-700">
                  {item.provider ?? "—"}
                </td>
                <td className="px-4 py-3">
                  {item.actorName ? (
                    <div>
                      <div className="font-medium text-gray-900 text-xs">{item.actorName}</div>
                      {item.actorEmail && (
                        <div className="text-xs text-gray-400">{item.actorEmail}</div>
                      )}
                    </div>
                  ) : (
                    <span className="text-gray-400 text-xs italic">System</span>
                  )}
                </td>
                <td className="px-4 py-3 text-xs text-gray-500">{item.storeName ?? "—"}</td>
                <td className="px-4 py-3 font-mono text-xs text-gray-400">
                  {item.targetId.slice(0, 8)}…
                </td>
                <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">
                  {relativeDate(item.createdAt)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination page={page} total={total} pageSize={pageSize} buildUrl={buildUrl} />
    </div>
  );
}
