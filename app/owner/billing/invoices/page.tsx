import Link from "next/link";
import { requireOwnerAdminAccess } from "@/lib/owner/auth-guard";
import { listBillingInvoices } from "@/services/owner/owner-billing.service";
import { formatPriceMinor } from "@/lib/billing/labels";
import InvoiceStatusBadge from "@/components/owner/billing/InvoiceStatusBadge";

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

const STATUS_TABS = [
  { label: "All", value: "" },
  { label: "Paid", value: "PAID" },
  { label: "Open", value: "OPEN" },
  { label: "Past due", value: "PAST_DUE" },
  { label: "Failed", value: "FAILED" },
];

interface Props {
  searchParams: { status?: string; page?: string };
}

export default async function InvoiceListPage({ searchParams }: Props) {
  const ctx = await requireOwnerAdminAccess();
  const tenantId = ctx.tenantMemberships[0]?.tenantId ?? "";

  const page = Math.max(1, parseInt(searchParams.page ?? "1", 10));
  const status = searchParams.status ?? "";

  const result = await listBillingInvoices(tenantId, {
    status: status || undefined,
    page,
    pageSize: 25,
  });

  function buildUrl(params: { status?: string; page?: number }): string {
    const p = new URLSearchParams();
    const s = params.status ?? status;
    if (s) p.set("status", s);
    const pg = params.page ?? page;
    if (pg > 1) p.set("page", String(pg));
    const qs = p.toString();
    return `/owner/billing/invoices${qs ? `?${qs}` : ""}`;
  }

  return (
    <div>
      <div className="mb-6 flex items-center gap-4">
        <Link
          href="/owner/billing"
          className="text-xs text-gray-500 hover:text-gray-700"
        >
          ← Billing
        </Link>
        <h1 className="text-xl font-bold text-gray-900">Billing History</h1>
      </div>

      {/* Status filter tabs */}
      <div className="flex items-center gap-1 mb-6 border-b border-gray-200">
        {STATUS_TABS.map((tab) => {
          const active = (status || "") === tab.value;
          return (
            <Link
              key={tab.value}
              href={buildUrl({ status: tab.value, page: 1 })}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                active
                  ? "border-brand-600 text-brand-700"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>

      {result.items.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-lg p-10 text-center">
          <p className="text-sm font-medium text-gray-700">No invoices found.</p>
          <p className="text-xs text-gray-400 mt-1">
            Try a different filter or check back later.
          </p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">
                    Invoice #
                  </th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">
                    Billed Date
                  </th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">
                    Period
                  </th>
                  <th className="text-right px-4 py-2.5 text-xs font-medium text-gray-500">
                    Amount
                  </th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">
                    Status
                  </th>
                  <th className="px-4 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {result.items.map((inv) => (
                  <tr key={inv.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {inv.invoiceNumber ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">{fmtDate(inv.billedAt)}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {fmtPeriod(inv.billingPeriodStart, inv.billingPeriodEnd)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums font-medium text-gray-900">
                      {formatPriceMinor(inv.totalMinor, inv.currency)}
                    </td>
                    <td className="px-4 py-3">
                      <InvoiceStatusBadge status={inv.status} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <Link
                          href={`/owner/billing/invoices/${inv.id}`}
                          className="text-xs text-brand-600 hover:text-brand-800 font-medium"
                        >
                          View
                        </Link>
                        {inv.pdfUrl && (
                          <a
                            href={inv.pdfUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-gray-500 hover:text-gray-700"
                          >
                            Download
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {result.totalPages > 1 && (
            <div className="border-t border-gray-200 px-4 py-3 flex items-center justify-between bg-gray-50">
              <span className="text-xs text-gray-500">
                Showing {(page - 1) * result.pageSize + 1}–
                {Math.min(page * result.pageSize, result.total)} of {result.total} invoices
              </span>
              <div className="flex items-center gap-2">
                {page > 1 && (
                  <Link
                    href={buildUrl({ page: page - 1 })}
                    className="px-3 py-1.5 text-xs border border-gray-200 rounded hover:bg-white text-gray-700"
                  >
                    ← Previous
                  </Link>
                )}
                <span className="text-xs text-gray-500">
                  Page {page} of {result.totalPages}
                </span>
                {page < result.totalPages && (
                  <Link
                    href={buildUrl({ page: page + 1 })}
                    className="px-3 py-1.5 text-xs border border-gray-200 rounded hover:bg-white text-gray-700"
                  >
                    Next →
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
