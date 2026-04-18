"use client";

/**
 * SyncPolicyTable — table of CatalogSyncPolicyDto rows.
 */

import type { CatalogSyncPolicyDto } from "@/types/catalog-sync";

interface Props {
  policies: CatalogSyncPolicyDto[];
}

export default function SyncPolicyTable({ policies }: Props) {
  if (policies.length === 0) {
    return (
      <div className="text-sm text-gray-500 py-6 text-center">
        No explicit policies configured. Using defaults.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded border border-gray-200">
      <table className="min-w-full text-sm divide-y divide-gray-200">
        <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
          <tr>
            <th className="px-4 py-2 text-left">Scope</th>
            <th className="px-4 py-2 text-left">Field</th>
            <th className="px-4 py-2 text-left">Direction</th>
            <th className="px-4 py-2 text-left">Conflict Strategy</th>
            <th className="px-4 py-2 text-left">Auto-Apply</th>
            <th className="px-4 py-2 text-left">Priority</th>
            <th className="px-4 py-2 text-left">Enabled</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 bg-white">
          {policies.map((policy) => (
            <tr key={policy.id} className="hover:bg-gray-50">
              <td className="px-4 py-2 font-medium text-gray-800">{policy.scope}</td>
              <td className="px-4 py-2 text-gray-600">{policy.fieldPath ?? <span className="italic text-gray-400">all fields</span>}</td>
              <td className="px-4 py-2 text-xs">{policy.direction}</td>
              <td className="px-4 py-2 text-xs">{policy.conflictStrategy}</td>
              <td className="px-4 py-2 text-xs">{policy.autoApplyMode}</td>
              <td className="px-4 py-2 text-center text-gray-600">{policy.priority}</td>
              <td className="px-4 py-2 text-center">
                {policy.isEnabled ? (
                  <span className="text-green-600 font-medium">✓</span>
                ) : (
                  <span className="text-gray-400">—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
