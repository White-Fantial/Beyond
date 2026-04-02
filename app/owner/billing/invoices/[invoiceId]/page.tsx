import Link from "next/link";
import { requireOwnerAdminAccess } from "@/lib/owner/auth-guard";
import { getBillingInvoiceDetail } from "@/services/owner/owner-billing.service";
import { formatPriceMinor } from "@/lib/billing/labels";
import InvoiceStatusBadge from "@/components/owner/billing/InvoiceStatusBadge";
import StatusBadge from "@/components/owner/billing/StatusBadge";
import type { OwnerPaymentAttemptStatus } from "@/types/owner-billing";

function fmtDate(d: Date | null | undefined): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-NZ", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function fmtPeriod(start: Date | null | undefined, end: Date | null | undefined): string {
  if (!start && !end) return "—";
  return `${fmtDate(start)} – ${fmtDate(end)}`;
}

const attemptStatusColor: Record<OwnerPaymentAttemptStatus, string> = {
  SUCCEEDED: "green",
  FAILED: "red",
  REQUIRES_ACTION: "yellow",
  PROCESSING: "blue",
  CANCELED: "gray",
};

const attemptStatusLabel: Record<OwnerPaymentAttemptStatus, string> = {
  SUCCEEDED: "Succeeded",
  FAILED: "Failed",
  REQUIRES_ACTION: "Action required",
  PROCESSING: "Processing",
  CANCELED: "Canceled",
};

interface Props {
  params: { invoiceId: string };
}

export default async function InvoiceDetailPage({ params }: Props) {
  const ctx = await requireOwnerAdminAccess();
  const tenantId = ctx.tenantMemberships[0]?.tenantId ?? "";

  const invoice = await getBillingInvoiceDetail(tenantId, params.invoiceId);

  if (!invoice) {
    return (
      <div>
        <div className="mb-6">
          <Link href="/owner/billing/invoices" className="text-xs text-gray-500 hover:text-gray-700">
            ← Invoices
          </Link>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-10 text-center">
          <p className="text-sm font-medium text-gray-700">Invoice not found.</p>
          <p className="text-xs text-gray-400 mt-1">
            This invoice may have been removed or you may not have access.
          </p>
          <Link
            href="/owner/billing/invoices"
            className="inline-block mt-4 text-xs text-brand-600 hover:text-brand-800 font-medium"
          >
            ← Back to invoices
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Back + header */}
      <div className="mb-6">
        <Link href="/owner/billing/invoices" className="text-xs text-gray-500 hover:text-gray-700">
          ← Invoices
        </Link>
        <div className="mt-3 flex items-center gap-3 flex-wrap">
          <h1 className="text-xl font-bold text-gray-900">
            Invoice {invoice.invoiceNumber ?? invoice.id}
          </h1>
          <InvoiceStatusBadge status={invoice.status} />
        </div>
      </div>

      {/* Key fields */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <div className="text-xs text-gray-500 mb-1">Billed date</div>
            <div className="text-sm font-medium text-gray-900">{fmtDate(invoice.billedAt)}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500 mb-1">Due date</div>
            <div className="text-sm font-medium text-gray-900">{fmtDate(invoice.dueAt)}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500 mb-1">Paid date</div>
            <div className="text-sm font-medium text-gray-900">{fmtDate(invoice.paidAt)}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500 mb-1">Billing period</div>
            <div className="text-sm font-medium text-gray-900">
              {fmtPeriod(invoice.billingPeriodStart, invoice.billingPeriodEnd)}
            </div>
          </div>
        </div>

        {/* Links */}
        {(invoice.hostedInvoiceUrl || invoice.pdfUrl) && (
          <div className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-4">
            {invoice.hostedInvoiceUrl && (
              <a
                href={invoice.hostedInvoiceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-brand-600 hover:text-brand-800 font-medium"
              >
                View invoice →
              </a>
            )}
            {invoice.pdfUrl && (
              <a
                href={invoice.pdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-gray-500 hover:text-gray-700"
              >
                Download PDF
              </a>
            )}
          </div>
        )}
      </div>

      {/* Money summary */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
        <h2 className="text-sm font-semibold text-gray-900 mb-4">Summary</h2>
        <div className="space-y-2 max-w-xs">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Subtotal</span>
            <span className="text-gray-900 tabular-nums">
              {formatPriceMinor(invoice.subtotalMinor, invoice.currency)}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Tax</span>
            <span className="text-gray-900 tabular-nums">
              {formatPriceMinor(invoice.taxMinor, invoice.currency)}
            </span>
          </div>
          <div className="flex justify-between text-sm font-semibold border-t border-gray-100 pt-2">
            <span className="text-gray-900">Total</span>
            <span className="text-gray-900 tabular-nums">
              {formatPriceMinor(invoice.totalMinor, invoice.currency)}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Amount paid</span>
            <span className="text-green-700 tabular-nums">
              {formatPriceMinor(invoice.amountPaidMinor, invoice.currency)}
            </span>
          </div>
          {invoice.amountDueMinor > 0 && (
            <div className="flex justify-between text-sm font-semibold bg-red-50 border border-red-200 rounded px-3 py-2">
              <span className="text-red-800">Amount due</span>
              <span className="text-red-800 tabular-nums">
                {formatPriceMinor(invoice.amountDueMinor, invoice.currency)}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Line items */}
      {invoice.lines.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden mb-6">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-900">Line Items</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">
                    Description
                  </th>
                  <th className="text-right px-4 py-2.5 text-xs font-medium text-gray-500">Qty</th>
                  <th className="text-right px-4 py-2.5 text-xs font-medium text-gray-500">
                    Unit price
                  </th>
                  <th className="text-right px-4 py-2.5 text-xs font-medium text-gray-500">
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {invoice.lines.map((line) => (
                  <tr key={line.id}>
                    <td className="px-4 py-3 text-gray-900">{line.description}</td>
                    <td className="px-4 py-3 text-right text-gray-500 tabular-nums">
                      {line.quantity ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-500 tabular-nums">
                      {line.unitAmountMinor !== null
                        ? formatPriceMinor(line.unitAmountMinor, invoice.currency)
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900 tabular-nums">
                      {formatPriceMinor(line.amountMinor, invoice.currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Payment attempts */}
      {invoice.paymentAttempts.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Payment Attempts</h2>
          <div className="space-y-3">
            {invoice.paymentAttempts.map((attempt) => (
              <div key={attempt.id} className="flex items-start gap-3">
                <div className="mt-0.5">
                  <StatusBadge
                    label={attemptStatusLabel[attempt.status]}
                    color={attemptStatusColor[attempt.status]}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-gray-500">
                    {new Date(attempt.attemptedAt).toLocaleString("en-NZ")}
                  </div>
                  {attempt.failureMessage && (
                    <div className="text-xs text-red-600 mt-0.5">{attempt.failureMessage}</div>
                  )}
                  {attempt.retryable && (
                    <div className="text-xs text-gray-400 mt-0.5">Will be retried automatically.</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="text-sm">
        <Link
          href="/owner/billing/invoices"
          className="text-xs text-gray-500 hover:text-gray-700"
        >
          ← Back to invoices
        </Link>
      </div>
    </div>
  );
}
