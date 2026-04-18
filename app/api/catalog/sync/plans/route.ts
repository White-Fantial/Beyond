/**
 * GET /api/catalog/sync/plans — list sync plans for a connection
 */

import { NextRequest, NextResponse } from "next/server";
import { listSyncPlans } from "@/services/catalog-sync-planner.service";
import type { CatalogSyncPlanStatus } from "@/types/catalog-sync";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const connectionId = searchParams.get("connectionId");
  if (!connectionId) {
    return NextResponse.json({ error: "connectionId is required" }, { status: 400 });
  }

  const status = searchParams.get("status") as CatalogSyncPlanStatus | undefined;
  const limit = parseInt(searchParams.get("limit") ?? "50", 10);
  const offset = parseInt(searchParams.get("offset") ?? "0", 10);

  const plans = await listSyncPlans({ connectionId, status: status ?? undefined, limit, offset });
  return NextResponse.json({ plans });
}
