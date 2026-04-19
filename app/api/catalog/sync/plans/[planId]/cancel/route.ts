/**
 * POST /api/catalog/sync/plans/[planId]/cancel — cancel a sync plan
 */

import { NextRequest, NextResponse } from "next/server";
import { cancelSyncPlan } from "@/services/catalog-sync-executor.service";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ planId: string }> }
) {
  const { planId } = await params;
  await cancelSyncPlan(planId);
  return NextResponse.json({ success: true });
}
