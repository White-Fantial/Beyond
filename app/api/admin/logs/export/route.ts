import { NextRequest, NextResponse } from "next/server";
import { requirePlatformAdmin } from "@/lib/admin/auth-guard";
import { listAdminLogs } from "@/services/admin/admin-log.service";
import { parseAdminLogFilters } from "@/lib/admin/logs/filters";
import { toCsv, csvResponseHeaders } from "@/lib/export/csv";
import { toHtmlReport, htmlReportResponseHeaders } from "@/lib/export/html-report";

export async function GET(req: NextRequest) {
  try {
    await requirePlatformAdmin();

    const { searchParams } = new URL(req.url);
    const format = searchParams.get("format") ?? "csv";

    // Parse filters — enforce a higher page size for exports (up to 1000 rows)
    const rawParams = Object.fromEntries(searchParams.entries());
    const filters = parseAdminLogFilters({
      ...rawParams,
      page: "1",
      pageSize: String(Math.min(parseInt(rawParams.pageSize ?? "500", 10), 1000)),
    });

    const { items } = await listAdminLogs(filters);
    const timestamp = new Date().toISOString().slice(0, 10);
    const filename = `admin-logs-${timestamp}`;

    if (format === "html") {
      const html = toHtmlReport({
        title: "Admin Logs Export",
        subtitle: `Log type: ${filters.logType ?? "all"} | Generated ${new Date().toUTCString()}`,
        sections: [
          {
            title: "Log Entries",
            columns: [
              { key: "occurredAt", label: "Time" },
              { key: "logType", label: "Type" },
              { key: "severity", label: "Severity" },
              { key: "title", label: "Title" },
              { key: "provider", label: "Provider" },
              { key: "tenantName", label: "Tenant" },
              { key: "storeName", label: "Store" },
              { key: "status", label: "Status" },
              { key: "errorCode", label: "Error Code" },
            ],
            rows: items.map((item) => ({
              ...item,
              occurredAt: item.occurredAt instanceof Date
                ? item.occurredAt.toISOString()
                : String(item.occurredAt),
            })),
          },
        ],
      });

      return new NextResponse(html, {
        headers: htmlReportResponseHeaders(`${filename}.html`),
      });
    }

    // Default: CSV
    const csv = toCsv(
      items.map((item) => ({
        ...item,
        occurredAt: item.occurredAt instanceof Date
          ? item.occurredAt.toISOString()
          : String(item.occurredAt),
      })),
      [
        { key: "occurredAt", label: "Occurred At" },
        { key: "logType", label: "Log Type" },
        { key: "severity", label: "Severity" },
        { key: "title", label: "Title" },
        { key: "provider", label: "Provider" },
        { key: "actionType", label: "Action Type" },
        { key: "status", label: "Status" },
        { key: "tenantName", label: "Tenant" },
        { key: "storeName", label: "Store" },
        { key: "errorCode", label: "Error Code" },
      ]
    );

    return new NextResponse(csv, {
      headers: csvResponseHeaders(`${filename}.csv`),
    });
  } catch (err: unknown) {
    console.error("[admin/logs/export] GET error:", err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
