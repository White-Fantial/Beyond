import { NextRequest, NextResponse } from "next/server";
import { parseReportFilters } from "@/lib/owner/reports/filters";
import { getStoreOwnerReports } from "@/services/owner/reports/owner-reports.service";
import { resolveActorTenantId, requireOwnerStoreAccess } from "@/services/owner/owner-authz.service";

export async function GET(
  request: NextRequest,
  { params }: { params: { storeId: string } }
) {
  try {
    const { storeId } = params;

    const ctx = await requireOwnerStoreAccess(storeId);

    const tenantId = resolveActorTenantId(ctx, storeId);
    if (!tenantId) {
      return NextResponse.json({ error: "No tenant context" }, { status: 403 });
    }

    const filters = parseReportFilters(request.nextUrl.searchParams);
    const data = await getStoreOwnerReports({ tenantId, storeId, filters });

    return NextResponse.json({ data });
  } catch (err) {
    console.error("[owner/stores/reports] Unexpected error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
