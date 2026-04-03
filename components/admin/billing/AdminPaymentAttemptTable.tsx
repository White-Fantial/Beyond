import type { PaymentAttemptRow } from "@/services/admin/admin-subscription.service";

const STATUS_COLORS: Record<string, string> = {
  SUCCEEDED: "bg-green-100 text-green-700",
  FAILED: "bg-red-100 text-red-700",
  PROCESSING: "bg-yellow-100 text-yellow-700",
  CANCELLED: "bg-gray-100 text-gray-600",
};

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleString("en-NZ", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

interface Props {
  attempts: PaymentAttemptRow[];
  tenantId: string;
}

export default function AdminPaymentAttemptTable({ attempts, tenantId }: Props) {
  if (attempts.length === 0) {
    return <p className="text-sm text-gray-400">No payment attempts recorded.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100 text-xs text-gray-500">
            <th className="pb-2 text-left font-medium">Date</th>
            <th className="pb-2 text-left font-medium">Status</th>
            <th className="pb-2 text-left font-medium">Invoice</th>
            <th className="pb-2 text-left font-medium">Failure</th>
            <th className="pb-2 text-left font-medium">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {attempts.map((a) => (
            <tr key={a.id}>
              <td className="py-2 text-gray-600 whitespace-nowrap">{fmtDate(a.attemptedAt)}</td>
              <td className="py-2">
                <span
                  className={`rounded px-2 py-0.5 text-xs font-medium ${
                    STATUS_COLORS[a.status] ?? "bg-gray-100 text-gray-600"
                  }`}
                >
                  {a.status}
                </span>
              </td>
              <td className="py-2 font-mono text-xs text-gray-400">
                {a.invoiceId ? a.invoiceId.slice(0, 8) : "—"}
              </td>
              <td className="py-2 text-xs text-red-600 max-w-xs truncate">
                {a.failureCode ? `${a.failureCode}: ${a.failureMessage ?? ""}` : "—"}
              </td>
              <td className="py-2">
                {a.retryable && a.invoiceId && (
                  <form
                    action={`/api/admin/billing/tenants/${tenantId}/payment-attempts/${a.invoiceId}/retry`}
                    method="POST"
                  >
                    <button
                      type="submit"
                      className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                    >
                      Retry
                    </button>
                  </form>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
