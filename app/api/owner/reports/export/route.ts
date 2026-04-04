import { NextRequest, NextResponse } from "next/server";
import { requireOwnerPortalAccess } from "@/lib/owner/auth-guard";
import { OWNER_PORTAL_MEMBERSHIP_ROLES } from "@/lib/auth/constants";
import { parseReportFilters } from "@/lib/owner/reports/filters";
import { getTenantOwnerReports } from "@/services/owner/reports/owner-reports.service";
import { toCsv, csvResponseHeaders } from "@/lib/export/csv";
import { toHtmlReport, htmlReportResponseHeaders } from "@/lib/export/html-report";

export async function GET(req: NextRequest) {
  try {
    const ctx = await requireOwnerPortalAccess();

    const ownerMembership =
      ctx.tenantMemberships.find((tm) =>
        OWNER_PORTAL_MEMBERSHIP_ROLES.includes(tm.membershipRole)
      ) ?? ctx.tenantMemberships[0];

    const tenantId = ownerMembership?.tenantId ?? "";
    if (!tenantId) return NextResponse.json({ error: "No tenant context" }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const format = searchParams.get("format") ?? "csv";
    const filters = parseReportFilters(searchParams);

    const report = await getTenantOwnerReports({ tenantId, filters });
    const filename = `owner-report-${report.fromDate}-${report.toDate}`;

    if (format === "html") {
      const html = toHtmlReport({
        title: "Owner Reports",
        subtitle: `${report.fromDate} — ${report.toDate} · ${report.currencyCode}`,
        sections: [
          {
            title: "Revenue Trend",
            columns: [
              { key: "dateLabel", label: "Date" },
              { key: "revenueMinor", label: "Revenue (minor unit)", align: "right" },
              { key: "orderCount", label: "Orders", align: "right" },
            ],
            rows: report.revenueTrend,
          },
          {
            title: "Channel Breakdown",
            columns: [
              { key: "channel", label: "Channel" },
              { key: "revenueMinor", label: "Revenue (minor unit)", align: "right" },
              { key: "orderCount", label: "Orders", align: "right" },
            ],
            rows: report.channelBreakdown,
          },
          {
            title: "Top Products",
            columns: [
              { key: "productName", label: "Product" },
              { key: "orderCount", label: "Orders", align: "right" },
              { key: "revenueMinor", label: "Revenue (minor unit)", align: "right" },
            ],
            rows: report.topProducts,
          },
        ],
      });

      return new NextResponse(html, {
        headers: htmlReportResponseHeaders(`${filename}.html`),
      });
    }

    // Default: CSV of revenue trend
    const csv = toCsv(report.revenueTrend, [
      { key: "dateLabel", label: "Date" },
      { key: "dateKey", label: "Date (ISO)" },
      { key: "revenueMinor", label: "Revenue (minor unit)" },
      { key: "orderCount", label: "Order Count" },
      { key: "completedOrderCount", label: "Completed" },
      { key: "cancelledOrderCount", label: "Cancelled" },
    ]);

    return new NextResponse(csv, {
      headers: csvResponseHeaders(`${filename}.csv`),
    });
  } catch (err: unknown) {
    console.error("[owner/reports/export] GET error:", err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
