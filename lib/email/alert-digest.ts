import { renderEmailHtml, escapeHtml } from "./renderer";

export interface AlertDigestEntry {
  ruleName: string;
  message: string;
  severity: string;
  triggeredAt: string;
}

export interface AlertDigestData {
  recipientName: string;
  storeName: string;
  tenantId: string;
  alerts: AlertDigestEntry[];
  periodLabel: string;
}

const SEVERITY_COLOR: Record<string, string> = {
  LOW: "#10b981",
  MEDIUM: "#f59e0b",
  HIGH: "#ef4444",
  CRITICAL: "#7c3aed",
};

export function renderAlertDigestEmail(data: AlertDigestData): {
  subject: string;
  html: string;
} {
  const subject = `Alert Digest — ${data.storeName} (${data.periodLabel})`;

  const rows = data.alerts
    .map(
      (a) =>
        `<tr>
          <td style="color:${SEVERITY_COLOR[a.severity] ?? "#374151"};font-weight:600">${escapeHtml(a.severity)}</td>
          <td>${escapeHtml(a.ruleName)}</td>
          <td>${escapeHtml(a.message)}</td>
          <td style="white-space:nowrap;color:#6b7280">${escapeHtml(a.triggeredAt)}</td>
        </tr>`
    )
    .join("");

  const body = `
    <h2 style="margin-top:0">Alert Digest — ${escapeHtml(data.periodLabel)}</h2>
    <p>Hi ${escapeHtml(data.recipientName)}, here is your alert summary for <strong>${escapeHtml(data.storeName)}</strong>.</p>
    <p>${data.alerts.length} alert${data.alerts.length !== 1 ? "s" : ""} triggered during this period.</p>
    <table>
      <thead><tr><th>Severity</th><th>Rule</th><th>Message</th><th>Time</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  `;

  return { subject, html: renderEmailHtml(subject, body) };
}
