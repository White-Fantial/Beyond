/**
 * GET /api/catalog/sync/plans/[planId] — get a single sync plan with items
 */

import { NextRequest, NextResponse } from "next/server";
import { getSyncPlan } from "@/services/catalog-sync-planner.service";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ planId: string }> }
) {
  const { planId } = await params;
  const plan = await getSyncPlan(planId);
  if (!plan) {
    return NextResponse.json({ error: "Plan not found" }, { status: 404 });
  }
  return NextResponse.json({ plan });
}
