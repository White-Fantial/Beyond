import { renderEmailHtml, escapeHtml } from "./renderer";

export type SubscriptionNoticeType = "INVOICE_PAID" | "INVOICE_FAILED" | "SUBSCRIPTION_PAUSED" | "SUBSCRIPTION_CANCELLED";

export interface SubscriptionNoticeData {
  type: SubscriptionNoticeType;
  customerName: string;
  storeName: string;
  subscriptionId: string;
  amount?: number;
  nextBillingDate?: string;
  reason?: string;
}

function formatMoney(minor: number): string {
  return new Intl.NumberFormat("en-NZ", { style: "currency", currency: "NZD" }).format(minor / 100);
}

const TYPE_CONFIG: Record<SubscriptionNoticeType, { subject: string; emoji: string; headline: string }> = {
  INVOICE_PAID: { subject: "Subscription Payment Confirmed", emoji: "✅", headline: "Your payment was successful" },
  INVOICE_FAILED: { subject: "Subscription Payment Failed", emoji: "⚠️", headline: "We couldn't process your payment" },
  SUBSCRIPTION_PAUSED: { subject: "Subscription Paused", emoji: "⏸️", headline: "Your subscription has been paused" },
  SUBSCRIPTION_CANCELLED: { subject: "Subscription Cancelled", emoji: "❌", headline: "Your subscription has been cancelled" },
};

export function renderSubscriptionNoticeEmail(data: SubscriptionNoticeData): {
  subject: string;
  html: string;
} {
  const config = TYPE_CONFIG[data.type];
  const subject = `${config.subject} — ${data.storeName}`;

  let details = "";
  if (data.amount) {
    details += `<p><strong>Amount:</strong> ${formatMoney(data.amount)}</p>`;
  }
  if (data.nextBillingDate) {
    details += `<p><strong>Next billing date:</strong> ${escapeHtml(data.nextBillingDate)}</p>`;
  }
  if (data.reason) {
    details += `<p><strong>Reason:</strong> ${escapeHtml(data.reason)}</p>`;
  }

  const body = `
    <h2 style="margin-top:0">${config.emoji} ${escapeHtml(config.headline)}</h2>
    <p>Hi ${escapeHtml(data.customerName)},</p>
    <p>This is a notification about your subscription with <strong>${escapeHtml(data.storeName)}</strong>.</p>
    ${details}
    <p style="color:#6b7280;font-size:14px">Subscription ID: ${escapeHtml(data.subscriptionId)}</p>
  `;

  return { subject, html: renderEmailHtml(subject, body) };
}
