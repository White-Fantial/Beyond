import Link from "next/link";
import StatusBadge from "@/components/admin/StatusBadge";
import type { AdminProviderAppCredentialListItem } from "@/types/admin";

interface Props {
  items: AdminProviderAppCredentialListItem[];
  emptyMessage?: string;
}

export default function ProviderAppCredentialTable({ items, emptyMessage }: Props) {
  if (items.length === 0) {
    return (
      <div className="text-sm text-gray-400 py-8 text-center">
        {emptyMessage ?? "No credentials found."}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
            <th className="pb-2 pr-4">Display Name</th>
            <th className="pb-2 pr-4">Provider</th>
            <th className="pb-2 pr-4">Auth Scheme</th>
            <th className="pb-2 pr-4">Environment</th>
            <th className="pb-2 pr-4">Tenant</th>
            <th className="pb-2 pr-4">Connections</th>
            <th className="pb-2 pr-4">Status</th>
            <th className="pb-2 pr-4">Created</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {items.map((item) => (
            <tr key={item.id} className="hover:bg-gray-50">
              <td className="py-2 pr-4">
                <Link
                  href={`/admin/integrations/credentials/${item.id}`}
                  className="font-medium text-blue-600 hover:underline"
                >
                  {item.displayName}
                </Link>
              </td>
              <td className="py-2 pr-4">
                <span className="font-mono text-xs text-gray-700">{item.provider}</span>
              </td>
              <td className="py-2 pr-4">
                <span className="font-mono text-xs text-gray-600">{item.authScheme}</span>
              </td>
              <td className="py-2 pr-4">
                <span
                  className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                    item.environment === "PRODUCTION"
                      ? "bg-green-100 text-green-700"
                      : "bg-yellow-100 text-yellow-700"
                  }`}
                >
                  {item.environment}
                </span>
              </td>
              <td className="py-2 pr-4">
                <span className="font-mono text-xs text-gray-500">
                  {item.tenantId ?? <span className="italic text-gray-400">Platform</span>}
                </span>
              </td>
              <td className="py-2 pr-4 text-gray-700">{item.connectionCount}</td>
              <td className="py-2 pr-4">
                <StatusBadge value={item.isActive ? "ACTIVE" : "INACTIVE"} />
              </td>
              <td className="py-2 pr-4 text-xs text-gray-400 whitespace-nowrap">
                {new Date(item.createdAt).toLocaleDateString("en-US")}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
