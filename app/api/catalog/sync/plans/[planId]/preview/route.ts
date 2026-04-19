/**
 * GET /api/catalog/sync/plans/[planId]/preview — preview sync plan
 */

import { NextRequest, NextResponse } from "next/server";
import { previewSyncPlan } from "@/services/catalog-sync-planner.service";

export async function GET(
  _req: NextRequest,
  { params }: { params: { planId: string } }
) {
  const { planId } = params;
  const preview = await previewSyncPlan(planId);
  return NextResponse.json({ preview });
}
