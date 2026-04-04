/**
 * HTML report export utility.
 *
 * Generates a print-ready HTML document that users can save/print as PDF.
 * Uses CSS print media queries for clean page layout.
 */

export interface HtmlReportSection {
  title: string;
  columns: Array<{ key: string; label: string; align?: "left" | "right" | "center" }>;
  rows: Array<Record<string, unknown>>;
}

export interface HtmlReportOptions {
  title: string;
  subtitle?: string;
  generatedAt?: string;
  sections: HtmlReportSection[];
}

function escapeHtml(value: unknown): string {
  if (value === null || value === undefined) return "—";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderTable(section: HtmlReportSection): string {
  const headers = section.columns
    .map((c) => `<th style="text-align:${c.align ?? "left"}">${escapeHtml(c.label)}</th>`)
    .join("");

  const bodyRows = section.rows
    .map(
      (row) =>
        `<tr>${section.columns
          .map(
            (c) =>
              `<td style="text-align:${c.align ?? "left"}">${escapeHtml(row[c.key])}</td>`
          )
          .join("")}</tr>`
    )
    .join("\n");

  return `
<section>
  <h2>${escapeHtml(section.title)}</h2>
  <table>
    <thead><tr>${headers}</tr></thead>
    <tbody>${bodyRows}</tbody>
  </table>
</section>`;
}

/**
 * Build a complete HTML report document.
 */
export function toHtmlReport(options: HtmlReportOptions): string {
  const { title, subtitle, generatedAt, sections } = options;
  const ts = generatedAt ?? new Date().toISOString();

  const sectionsHtml = sections.map(renderTable).join("\n");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; font-size: 12px; color: #111; margin: 0; padding: 20px; }
    h1 { font-size: 20px; margin: 0 0 4px; }
    .subtitle { color: #555; font-size: 12px; margin: 0 0 4px; }
    .meta { color: #888; font-size: 11px; margin: 0 0 24px; }
    h2 { font-size: 14px; font-weight: 600; margin: 20px 0 8px; border-bottom: 1px solid #e5e7eb; padding-bottom: 4px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
    th { background: #f9fafb; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: #6b7280; padding: 6px 10px; border-bottom: 2px solid #e5e7eb; }
    td { padding: 5px 10px; border-bottom: 1px solid #f3f4f6; color: #374151; }
    tr:last-child td { border-bottom: none; }
    @media print {
      body { padding: 0; }
      h2 { break-before: avoid; }
      table { break-inside: avoid; }
    }
  </style>
</head>
<body>
  <h1>${escapeHtml(title)}</h1>
  ${subtitle ? `<p class="subtitle">${escapeHtml(subtitle)}</p>` : ""}
  <p class="meta">Generated: ${escapeHtml(ts)}</p>
  ${sectionsHtml}
</body>
</html>`;
}

/**
 * Build HTTP response headers for an HTML report download.
 */
export function htmlReportResponseHeaders(filename: string): HeadersInit {
  return {
    "Content-Type": "text/html; charset=utf-8",
    "Content-Disposition": `attachment; filename="${filename}"`,
    "Cache-Control": "no-store",
  };
}
