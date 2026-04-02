import Link from "next/link";
import { requireOwnerAdminAccess } from "@/lib/owner/auth-guard";
import { getBillingOverview } from "@/services/owner/owner-billing.service";
import {
  labelOwnerSubscriptionStatus,
  colorOwnerSubscriptionStatus,
  colorOwnerUsageStatus,
  formatPriceMinor,
  labelBillingInterval,
  type OwnerSubscriptionStatusType,
  type OwnerUsageMetricStatusType,
} from "@/lib/billing/labels";
import AlertBanner from "@/components/owner/billing/AlertBanner";
import StatusBadge from "@/components/owner/billing/StatusBadge";
import InvoiceStatusBadge from "@/components/owner/billing/InvoiceStatusBadge";
import UsageBar from "@/components/owner/billing/UsageBar";

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

export default async function OwnerBillingPage() {
  const ctx = await requireOwnerAdminAccess();
  const tenantId = ctx.tenantMemberships[0]?.tenantId ?? "";
  const overview = await getBillingOverview(tenantId);
  const sub = overview.subscription;
  const plan = overview.plan;

  const quickActions = overview.quickActions.filter((a) => a.show);

  return (
    <div>
      {/* Page header */}
      <div className="mb-6 flex items-center gap-3 flex-wrap">
        <h1 className="text-xl font-bold text-gray-900">Billing</h1>
        {sub && (
          <StatusBadge
            label={labelOwnerSubscriptionStatus(sub.status as OwnerSubscriptionStatusType)}
            color={colorOwnerSubscriptionStatus(sub.status as OwnerSubscriptionStatusType)}
          />
        )}
      </div>

      {/* Alert banners */}
      {overview.alerts.length > 0 && (
        <div className="mb-6">
          <AlertBanner alerts={overview.alerts} />
        </div>
      )}

      {/* Overview card */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <div>
            <div className="text-xs text-gray-500 mb-1">Current plan</div>
            <div className="text-2xl font-bold text-gray-900">{plan?.name ?? "—"}</div>
            {sub && (
              <div className="mt-1 flex items-center gap-2 flex-wrap">
                <StatusBadge label={labelBillingInterval(sub.billingInterval)} color="blue" />
                {overview.trialDaysRemaining !== null && overview.trialDaysRemaining > 0 && (
                  <StatusBadge
                    label={`Trial: ${overview.trialDaysRemaining}d left`}
                    color="blue"
                  />
                )}
              </div>
            )}
          </div>

          <div>
            <div className="text-xs text-gray-500 mb-1">Price</div>
            <div className="text-lg font-semibold text-gray-900">
              {sub
                ? `${formatPriceMinor(sub.priceAmountMinor, sub.currencyCode)} / ${sub.billingInterval === "MONTHLY" ? "mo" : sub.billingInterval === "YEARLY" ? "yr" : "period"}`
                : "—"}
            </div>
          </div>

          <div>
            <div className="text-xs text-gray-500 mb-1">Next billing date</div>
            <div className="text-sm font-medium text-gray-900">
              {fmtDate(overview.nextBillingDate)}
            </div>
          </div>

          <div>
            <div className="text-xs text-gray-500 mb-1">Payment method</div>
            <div className="text-sm text-gray-900">
              {overview.paymentMethodSummary ?? "—"}
            </div>
          </div>

          <div>
            <div className="text-xs text-gray-500 mb-1">Billing status</div>
            <div className="text-sm text-gray-900">{overview.billingStatusLabel}</div>
          </div>

          {sub?.cancelAtPeriodEnd && (
            <div className="sm:col-span-2 lg:col-span-3">
              <div className="bg-orange-50 border border-orange-200 rounded-lg px-4 py-3 text-sm text-orange-800">
                ⚠️ Your subscription is set to cancel at the end of the current billing period (
                {fmtDate(sub.currentPeriodEnd)}).
              </div>
            </div>
          )}
        </div>

        {quickActions.length > 0 && (
          <div className="mt-6 pt-4 border-t border-gray-100 flex items-center gap-3 flex-wrap">
            {quickActions.map((action) => (
              <Link
                key={action.id}
                href={action.href}
                className={
                  action.variant === "primary"
                    ? "px-3 py-1.5 text-xs font-medium bg-brand-600 text-white rounded hover:bg-brand-700 transition-colors"
                    : action.variant === "danger"
                      ? "px-3 py-1.5 text-xs font-medium text-red-600 border border-red-200 rounded hover:bg-red-50 transition-colors"
                      : "px-3 py-1.5 text-xs font-medium text-gray-700 border border-gray-200 rounded hover:bg-gray-50 transition-colors"
                }
              >
                {action.label}
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Usage section */}
      {overview.usageMetrics.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Usage vs Plan Limits</h2>
          <div className="divide-y divide-gray-100">
            {overview.usageMetrics.map((metric) => (
              <div key={metric.metricKey} className="py-4 first:pt-0 last:pb-0">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-900">{metric.label}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">
                      {metric.limitValue !== null
                        ? `${metric.currentValue} / ${metric.limitValue} ${metric.unit}`
                        : `${metric.currentValue} (no limit)`}
                    </span>
                    <StatusBadge
                      label={metric.statusLabel}
                      color={colorOwnerUsageStatus(metric.status as OwnerUsageMetricStatusType)}
                    />
                  </div>
                </div>
                <UsageBar percent={metric.utilizationPercent} status={metric.status} />
                {metric.helperMessage && (
                  <p className="text-xs text-gray-400 mt-1">{metric.helperMessage}</p>
                )}
                {metric.showUpgradeCta && (
                  <Link
                    href="/owner/billing/plans"
                    className="inline-block mt-1 text-xs text-brand-600 hover:text-brand-800 font-medium"
                  >
                    Upgrade plan →
                  </Link>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent invoices */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-900">Recent Invoices</h2>
          <Link
            href="/owner/billing/invoices"
            className="text-xs text-brand-600 hover:text-brand-800 font-medium"
          >
            View all invoices →
          </Link>
        </div>
        {overview.recentInvoices.length === 0 ? (
          <p className="text-sm text-gray-400">No invoices yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">Invoice #</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">Period</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">Date</th>
                  <th className="text-right px-4 py-2.5 text-xs font-medium text-gray-500">Amount</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">Status</th>
                  <th className="px-4 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {overview.recentInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-900 font-medium">
                      {inv.invoiceNumber ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {fmtPeriod(inv.billingPeriodStart, inv.billingPeriodEnd)}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{fmtDate(inv.billedAt)}</td>
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
                            PDF
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="text-sm text-gray-500">
        <Link href="/owner/billing/plans" className="text-brand-600 hover:text-brand-800 font-medium">
          Manage your plan →
        </Link>
      </div>
    </div>
  );
}
