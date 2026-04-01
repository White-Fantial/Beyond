import Link from "next/link";
import AdminFeatureFlagStatusBadge from "./AdminFeatureFlagStatusBadge";
import { labelFlagType } from "@/lib/flags/labels";
import type { AdminFeatureFlagListItem } from "@/types/feature-flags";

interface Props {
  flags: AdminFeatureFlagListItem[];
}

export default function AdminFeatureFlagTable({ flags }: Props) {
  if (flags.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-500 text-sm">
        등록된 Feature Flag가 없습니다.
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200 text-xs text-gray-500">
            <th className="text-left px-4 py-3 font-medium">Key</th>
            <th className="text-left px-4 py-3 font-medium">이름</th>
            <th className="text-left px-4 py-3 font-medium">타입</th>
            <th className="text-left px-4 py-3 font-medium">상태</th>
            <th className="text-right px-4 py-3 font-medium">Assignment</th>
            <th className="text-right px-4 py-3 font-medium">수정일</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody>
          {flags.map((flag) => (
            <tr
              key={flag.id}
              className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
            >
              <td className="px-4 py-3 font-mono text-xs text-gray-700">{flag.key}</td>
              <td className="px-4 py-3 text-gray-900 font-medium">
                {flag.name}
                {flag.isExperiment && (
                  <span className="ml-1.5 text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full">
                    실험
                  </span>
                )}
              </td>
              <td className="px-4 py-3 text-gray-500">{labelFlagType(flag.flagType)}</td>
              <td className="px-4 py-3">
                <AdminFeatureFlagStatusBadge status={flag.status} />
              </td>
              <td className="px-4 py-3 text-right text-gray-500">
                <span className="text-green-700 font-medium">{flag.activeAssignmentCount}</span>
                <span className="text-gray-400"> / {flag.assignmentCount}</span>
              </td>
              <td className="px-4 py-3 text-right text-gray-400 text-xs">
                {flag.updatedAt.toLocaleDateString("ko-KR")}
              </td>
              <td className="px-4 py-3 text-right">
                <Link
                  href={`/admin/feature-flags/${flag.key}`}
                  className="text-xs text-blue-600 hover:underline"
                >
                  상세 →
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
