import Link from "next/link";
import type { WebhookEndpoint } from "@/types/owner-webhooks";

interface Props {
  items: WebhookEndpoint[];
}

export default function WebhookEndpointTable({ items }: Props) {
  if (items.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-sm text-gray-500">
        No webhook endpoints yet. Add one above.
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-gray-500 bg-gray-50 border-b border-gray-100">
              <th className="px-5 py-3 text-left font-medium">URL</th>
              <th className="px-5 py-3 text-left font-medium">Events</th>
              <th className="px-5 py-3 text-left font-medium">Status</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {items.map((ep) => (
              <tr key={ep.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-5 py-3 font-mono text-xs text-gray-700 max-w-xs truncate">
                  {ep.url}
                </td>
                <td className="px-5 py-3">
                  <div className="flex flex-wrap gap-1">
                    {ep.events.map((e) => (
                      <span
                        key={e}
                        className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600"
                      >
                        {e}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-5 py-3">
                  {ep.isActive ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                      Active
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
                      Disabled
                    </span>
                  )}
                </td>
                <td className="px-5 py-3 text-right">
                  <Link
                    href={`/owner/webhooks/${ep.id}`}
                    className="text-brand-600 hover:text-brand-800 text-xs font-medium"
                  >
                    View
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
