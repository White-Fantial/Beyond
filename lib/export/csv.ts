/**
 * CSV export utility — pure TypeScript, no external dependencies.
 *
 * Converts an array of objects to a well-formed RFC 4180 CSV string.
 */

/** Escape a single cell value per RFC 4180. */
function escapeCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  // Wrap in quotes if contains comma, quote, or newline
  if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Serialize an array of objects to a CSV string.
 *
 * @param rows     Array of plain objects (all rows must have same shape)
 * @param columns  Optional column definitions with header labels.
 *                 If omitted, keys of the first row are used.
 */
export function toCsv<T extends Record<string, unknown>>(
  rows: T[],
  columns?: Array<{ key: keyof T; label: string }>
): string {
  if (rows.length === 0) return "";

  const cols = columns ?? Object.keys(rows[0]).map((k) => ({ key: k as keyof T, label: k }));

  const header = cols.map((c) => escapeCell(c.label)).join(",");
  const body = rows
    .map((row) => cols.map((c) => escapeCell(row[c.key])).join(","))
    .join("\r\n");

  return `${header}\r\n${body}`;
}

/**
 * Build HTTP response headers for a CSV download.
 */
export function csvResponseHeaders(filename: string): HeadersInit {
  return {
    "Content-Type": "text/csv; charset=utf-8",
    "Content-Disposition": `attachment; filename="${filename}"`,
    "Cache-Control": "no-store",
  };
}
