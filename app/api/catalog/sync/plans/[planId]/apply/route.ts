/**
 * POST /api/catalog/sync/plans/[planId]/apply — apply a sync plan
 *
 * Body (optional):
 *   { statusFilter?: string[], safeOnly?: boolean }
 */

import { NextRequest, NextResponse } from "next/server";
import { applySyncPlan } from "@/services/catalog-sync-executor.service";
import type { ApplySyncPlanOptions } from "@/types/catalog-sync";

export async function POST(
  req: NextRequest,
  { params }: { params: { planId: string } }
) {
  const { planId } = params;
  let opts: ApplySyncPlanOptions = {};
  try {
    const body = await req.json();
    opts = body ?? {};
  } catch {
    // opts stays empty, which is fine
  }

  const result = await applySyncPlan(planId, opts);
  return NextResponse.json({ result });
}
