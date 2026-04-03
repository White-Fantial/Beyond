import { NextRequest, NextResponse } from "next/server";
import { requireStorePermission } from "@/lib/auth/permissions";
import { PERMISSIONS } from "@/lib/auth/constants";
import { getReportData } from "@/services/backoffice/backoffice-reports.service";

/**
 * GET /api/backoffice/[storeId]/reports
 * Query: ?days=30  (optional; 7 / 14 / 30, default 30, max 90)
 *
 * Returns operational report data for the period.
 * Requires the REPORTS permission on the store.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ storeId: string }> }
) {
  try {
    const { storeId } = await params;
    await requireStorePermission(storeId, PERMISSIONS.REPORTS);

    const { searchParams } = new URL(req.url);
    const daysParam = searchParams.get("days");
    const days = daysParam ? parseInt(daysParam, 10) : 30;

    const data = await getReportData(storeId, days);
    return NextResponse.json({ data });
  } catch (err) {
    console.error("[backoffice/reports] Unexpected error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
