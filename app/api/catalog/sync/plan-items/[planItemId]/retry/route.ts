/**
 * POST /api/catalog/sync/plan-items/[planItemId]/retry — retry a failed plan item
 */

import { NextRequest, NextResponse } from "next/server";
import { retrySyncPlanItem } from "@/services/catalog-sync-executor.service";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ planItemId: string }> }
) {
  const { planItemId } = await params;
  const result = await retrySyncPlanItem(planItemId);
  const status = result.success ? 200 : 422;
  return NextResponse.json(result, { status });
}
