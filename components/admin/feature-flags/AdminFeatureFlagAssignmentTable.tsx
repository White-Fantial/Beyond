"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { labelFlagScopeType } from "@/lib/flags/labels";
import type { AdminFeatureFlagAssignment } from "@/types/feature-flags";

interface Props {
  assignments: AdminFeatureFlagAssignment[];
  flagKey: string;
}

export default function AdminFeatureFlagAssignmentTable({ assignments, flagKey }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  async function handleToggle(assignmentId: string, current: boolean) {
    setLoading(assignmentId);
    try {
      const res = await fetch(
        `/api/admin/feature-flags/${flagKey}/assignments/${assignmentId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isActive: !current }),
        }
      );
      if (res.ok) router.refresh();
    } finally {
      setLoading(null);
    }
  }

  async function handleDelete(assignmentId: string) {
    if (!confirm("이 Assignment를 삭제하시겠습니까?")) return;
    setLoading(assignmentId);
    try {
      const res = await fetch(
        `/api/admin/feature-flags/${flagKey}/assignments/${assignmentId}`,
        { method: "DELETE" }
      );
      if (res.ok) router.refresh();
    } finally {
      setLoading(null);
    }
  }

  if (assignments.length === 0) {
    return (
      <div className="text-sm text-gray-400 text-center py-6">
        등록된 Assignment가 없습니다.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-xs text-gray-500 border-b border-gray-100">
            <th className="text-left pb-2 pr-3">범위</th>
            <th className="text-left pb-2 pr-3">Scope Key</th>
            <th className="text-left pb-2 pr-3">값</th>
            <th className="text-right pb-2 pr-3">우선순위</th>
            <th className="text-left pb-2 pr-3">상태</th>
            <th className="text-left pb-2">노트</th>
            <th className="pb-2" />
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {assignments.map((a) => (
            <tr key={a.id} className={a.isActive ? "" : "opacity-50"}>
              <td className="py-2 pr-3 text-gray-700 font-medium text-xs">
                {labelFlagScopeType(a.scopeType)}
              </td>
              <td className="py-2 pr-3 font-mono text-xs text-gray-500">
                {a.scopeKey ?? <span className="text-gray-300">—</span>}
              </td>
              <td className="py-2 pr-3 text-gray-700 text-xs">
                {a.boolValue !== null
                  ? a.boolValue
                    ? "true"
                    : "false"
                  : a.stringValue ?? (a.intValue !== null ? String(a.intValue) : <span className="text-gray-300">—</span>)}
              </td>
              <td className="py-2 pr-3 text-right text-gray-500 text-xs">{a.priority}</td>
              <td className="py-2 pr-3">
                <span
                  className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${
                    a.isActive
                      ? "bg-green-100 text-green-700"
                      : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {a.isActive ? "활성" : "비활성"}
                </span>
              </td>
              <td className="py-2 text-gray-400 text-xs max-w-[120px] truncate">
                {a.note ?? ""}
              </td>
              <td className="py-2 text-right whitespace-nowrap">
                <button
                  onClick={() => handleToggle(a.id, a.isActive)}
                  disabled={loading === a.id}
                  className="text-xs text-blue-600 hover:underline mr-3 disabled:opacity-50"
                >
                  {a.isActive ? "비활성화" : "활성화"}
                </button>
                <button
                  onClick={() => handleDelete(a.id)}
                  disabled={loading === a.id}
                  className="text-xs text-red-500 hover:underline disabled:opacity-50"
                >
                  삭제
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
