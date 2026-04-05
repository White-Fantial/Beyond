import { renderEmailHtml, escapeHtml } from "./renderer";

export interface OrderConfirmationData {
  orderId: string;
  customerName: string;
  storeName: string;
  items: Array<{ name: string; quantity: number; unitPrice: number; total: number }>;
  totalAmount: number;
  discountApplied?: number;
  loyaltyPointsEarned?: number;
  estimatedPickupAt: string;
  currencyCode: string;
}

function formatMoney(minor: number, currency = "NZD"): string {
  return new Intl.NumberFormat("en-NZ", { style: "currency", currency }).format(minor / 100);
}

export function renderOrderConfirmationEmail(data: OrderConfirmationData): {
  subject: string;
  html: string;
} {
  const subject = `Order Confirmed — ${data.storeName} (#${data.orderId.slice(-8).toUpperCase()})`;

  const itemRows = data.items
    .map(
      (item) =>
        `<tr><td>${escapeHtml(item.name)}</td><td style="text-align:center">${item.quantity}</td><td style="text-align:right">${formatMoney(item.total, data.currencyCode)}</td></tr>`
    )
    .join("");

  const discountRow =
    data.discountApplied && data.discountApplied > 0
      ? `<tr><td colspan="2" style="color:#10b981;font-weight:600">Discount applied</td><td style="text-align:right;color:#10b981">-${formatMoney(data.discountApplied, data.currencyCode)}</td></tr>`
      : "";

  const loyaltyNote =
    data.loyaltyPointsEarned && data.loyaltyPointsEarned > 0
      ? `<p style="color:#4f46e5;font-weight:500">🏅 You earned <strong>${data.loyaltyPointsEarned} loyalty points</strong> on this order!</p>`
      : "";

  const body = `
    <h2 style="margin-top:0">Hi ${escapeHtml(data.customerName)}, your order is confirmed! 🎉</h2>
    <p>Your order from <strong>${escapeHtml(data.storeName)}</strong> has been received and is being prepared.</p>
    <p><strong>Estimated pickup:</strong> ${escapeHtml(data.estimatedPickupAt)}</p>
    <table>
      <thead><tr><th>Item</th><th style="text-align:center">Qty</th><th style="text-align:right">Total</th></tr></thead>
      <tbody>
        ${itemRows}
        ${discountRow}
        <tr style="font-weight:700"><td colspan="2">Order Total</td><td style="text-align:right">${formatMoney(data.totalAmount, data.currencyCode)}</td></tr>
      </tbody>
    </table>
    ${loyaltyNote}
    <p style="color:#6b7280;font-size:14px">Order ID: ${escapeHtml(data.orderId)}</p>
  `;

  return { subject, html: renderEmailHtml(subject, body) };
}
