import type { RoleChangeEvent } from "@/types/owner-activity";
import ActivityEventBadge from "./ActivityEventBadge";
import { relativeDate, TablePagination } from "./tableUtils";

interface Props {
  items: RoleChangeEvent[];
  total: number;
  page: number;
  pageSize: number;
  buildUrl: (page: number) => string;
}

export default function RoleChangeTable({ items, total, page, pageSize, buildUrl }: Props) {
  if (items.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-10 text-center">
        <p className="text-sm font-medium text-gray-700">No role changes found</p>
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
              <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">Actor</th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">Member</th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">Role Change</th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">Store</th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">When</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {items.map((item) => (
              <tr key={item.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <ActivityEventBadge action={item.action} />
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
                <td className="px-4 py-3">
                  {item.targetUserName ? (
                    <div>
                      <div className="font-medium text-gray-900 text-xs">{item.targetUserName}</div>
                      {item.targetUserEmail && (
                        <div className="text-xs text-gray-400">{item.targetUserEmail}</div>
                      )}
                    </div>
                  ) : (
                    <span className="font-mono text-xs text-gray-400">
                      {item.targetId.slice(0, 8)}…
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {item.previousRole || item.newRole ? (
                    <div className="flex items-center gap-1.5 text-xs">
                      {item.previousRole && (
                        <span className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 font-medium">
                          {item.previousRole}
                        </span>
                      )}
                      {item.previousRole && item.newRole && (
                        <span className="text-gray-400">→</span>
                      )}
                      {item.newRole && (
                        <span className="px-1.5 py-0.5 rounded bg-brand-50 text-brand-700 font-medium">
                          {item.newRole}
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-gray-400 text-xs">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-xs text-gray-500">{item.storeName ?? "—"}</td>
                <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">
                  {relativeDate(item.createdAt)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <TablePagination page={page} total={total} pageSize={pageSize} buildUrl={buildUrl} />
    </div>
  );
}
