import StatusBadge from "@/components/admin/StatusBadge";
import AdminEmptyState from "@/components/admin/AdminEmptyState";
import type { AdminConnectionCredentialRow } from "@/types/admin";

interface ConnectionCredentialTableProps {
  credentials: AdminConnectionCredentialRow[];
}

export default function ConnectionCredentialTable({ credentials }: ConnectionCredentialTableProps) {
  if (credentials.length === 0) {
    return <AdminEmptyState message="No credentials found." />;
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      <table className="min-w-full divide-y divide-gray-200 text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left font-medium text-gray-500">Type</th>
            <th className="px-4 py-3 text-left font-medium text-gray-500">Auth scheme</th>
            <th className="px-4 py-3 text-left font-medium text-gray-500 hidden sm:table-cell">Label</th>
            <th className="px-4 py-3 text-left font-medium text-gray-500">Active</th>
            <th className="px-4 py-3 text-left font-medium text-gray-500 hidden md:table-cell">Version</th>
            <th className="px-4 py-3 text-left font-medium text-gray-500 hidden lg:table-cell">Expires</th>
            <th className="px-4 py-3 text-left font-medium text-gray-500 hidden lg:table-cell">Last used</th>
            <th className="px-4 py-3 text-left font-medium text-gray-500 hidden xl:table-cell">Rotated</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 bg-white">
          {credentials.map((cr) => (
            <tr key={cr.id} className="hover:bg-gray-50">
              <td className="px-4 py-3 font-mono text-xs text-gray-700">{cr.credentialType}</td>
              <td className="px-4 py-3 font-mono text-xs text-gray-500">{cr.authScheme}</td>
              <td className="px-4 py-3 text-xs text-gray-500 hidden sm:table-cell">
                {cr.label ?? "—"}
              </td>
              <td className="px-4 py-3">
                <StatusBadge value={cr.isActive ? "ACTIVE" : "INACTIVE"} />
                {cr.requiresReauth && (
                  <span className="ml-1 text-xs text-amber-600 font-medium">Re-auth required</span>
                )}
              </td>
              <td className="px-4 py-3 text-xs text-gray-500 hidden md:table-cell">v{cr.version}</td>
              <td className="px-4 py-3 text-xs text-gray-400 hidden lg:table-cell">
                {cr.expiresAt ? cr.expiresAt.toLocaleString("en-US") : "—"}
              </td>
              <td className="px-4 py-3 text-xs text-gray-400 hidden lg:table-cell">
                {cr.lastUsedAt ? cr.lastUsedAt.toLocaleString("en-US") : "—"}
              </td>
              <td className="px-4 py-3 text-xs text-gray-400 hidden xl:table-cell">
                {cr.rotatedAt ? cr.rotatedAt.toLocaleString("en-US") : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
