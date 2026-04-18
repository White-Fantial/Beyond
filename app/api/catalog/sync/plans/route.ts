/**
 * GET /api/catalog/sync/plans — list sync plans for a connection
 */

import { NextRequest, NextResponse } from "next/server";
import { listSyncPlans } from "@/services/catalog-sync-planner.service";
import type { CatalogSyncPlanStatus } from "@/types/catalog-sync";

export async function GET(req: NextRequest) {
  const connectionId = req.nextUrl.searchParams.get("connectionId");
  if (!connectionId) {
    return NextResponse.json({ error: "connectionId is required" }, { status: 400 });
  }

  const status = req.nextUrl.searchParams.get("status") as CatalogSyncPlanStatus | undefined;
  const limit = parseInt(req.nextUrl.searchParams.get("limit") ?? "50", 10);
  const offset = parseInt(req.nextUrl.searchParams.get("offset") ?? "0", 10);

  const plans = await listSyncPlans({ connectionId, status: status ?? undefined, limit, offset });
  return NextResponse.json({ plans });
}
