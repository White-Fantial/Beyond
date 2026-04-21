import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserAuthContext } from "@/lib/auth/context";
import { listSupplierRequests } from "@/services/marketplace/supplier-requests.service";
import type { SupplierRequestStatus } from "@/types/owner-suppliers";

export async function GET(req: NextRequest) {
  const ctx = await getCurrentUserAuthContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!ctx.isPlatformAdmin && !ctx.isPlatformModerator) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const statusParam = searchParams.get("status");
  const tenantId = searchParams.get("tenantId") ?? undefined;
  const page = Number(searchParams.get("page") ?? "1");
  const pageSize = Number(searchParams.get("pageSize") ?? "50");

  const result = await listSupplierRequests({
    status: statusParam as SupplierRequestStatus | undefined,
    tenantId,
    page,
    pageSize,
  });
  return NextResponse.json({ data: result });
}
