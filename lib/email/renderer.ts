/**
 * Minimal HTML email template renderer.
 * Wraps content in a consistent branded layout.
 */
export function renderEmailHtml(title: string, bodyHtml: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(title)}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f9fafb; margin: 0; padding: 32px 16px; }
    .wrapper { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e5e7eb; overflow: hidden; }
    .header { background: #4f46e5; padding: 24px 32px; }
    .header h1 { color: #ffffff; margin: 0; font-size: 22px; }
    .body { padding: 32px; color: #374151; line-height: 1.6; }
    .footer { padding: 16px 32px; background: #f9fafb; border-top: 1px solid #e5e7eb; font-size: 12px; color: #9ca3af; text-align: center; }
    .btn { display: inline-block; background: #4f46e5; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 16px 0; }
    table { width: 100%; border-collapse: collapse; margin: 16px 0; }
    th, td { padding: 10px 12px; text-align: left; border-bottom: 1px solid #e5e7eb; font-size: 14px; }
    th { background: #f9fafb; font-weight: 600; color: #6b7280; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header"><h1>Beyond</h1></div>
    <div class="body">${bodyHtml}</div>
    <div class="footer">© ${new Date().getFullYear()} Beyond. All rights reserved.</div>
  </div>
</body>
</html>`;
}

export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
