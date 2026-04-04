"use client";

import type { OwnerConnectionActionLogRow } from "@/services/owner/owner-integrations.service";

interface Props {
  logs: OwnerConnectionActionLogRow[];
}

const ACTION_LEVEL: Record<string, "INFO" | "WARN" | "ERROR"> = {
  CONNECT_START: "INFO",
  CONNECT_SUCCESS: "INFO",
  REFRESH_SUCCESS: "INFO",
  DISCONNECT: "WARN",
  REAUTH_REQUIRED: "WARN",
  CONNECT_FAIL: "ERROR",
  REFRESH_FAIL: "ERROR",
};

const DOT_STYLES = {
  INFO: "bg-green-400",
  WARN: "bg-yellow-400",
  ERROR: "bg-red-500",
};

export default function ConnectionActionLogTable({ logs }: Props) {
  if (logs.length === 0) {
    return (
      <div className="p-6 text-center text-gray-400 text-sm">
        No connection logs yet.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 w-4" />
            <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">Action</th>
            <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">Status</th>
            <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">Store</th>
            <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">Message</th>
            <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">Time</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {logs.map((log) => {
            const level = ACTION_LEVEL[log.actionType] ?? "INFO";
            return (
              <tr key={log.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <span
                    className={`inline-block w-2 h-2 rounded-full ${DOT_STYLES[level]}`}
                  />
                </td>
                <td className="px-4 py-3 font-medium text-gray-900">{log.actionType}</td>
                <td className="px-4 py-3 text-gray-600">{log.status}</td>
                <td className="px-4 py-3 text-gray-500">{log.storeName}</td>
                <td className="px-4 py-3 text-gray-500 text-xs max-w-xs truncate">
                  {log.message ?? log.errorCode ?? "—"}
                </td>
                <td className="px-4 py-3 text-gray-400 whitespace-nowrap text-xs">
                  {new Date(log.createdAt).toLocaleString()}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
