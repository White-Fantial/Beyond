import { NextRequest, NextResponse } from "next/server";
import { requireStoreAccess } from "@/lib/auth/permissions";
import { getDashboardData } from "@/services/backoffice/backoffice-dashboard.service";

/**
 * GET /api/backoffice/[storeId]/dashboard
 *
 * Returns live KPI data for the backoffice dashboard.
 * Requires the caller to have store access (any store role).
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: { storeId: string } }
) {
  try {
    const { storeId } = params;
    await requireStoreAccess(storeId);

    const data = await getDashboardData(storeId);
    return NextResponse.json({ data });
  } catch (err) {
    console.error("[backoffice/dashboard] Unexpected error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
