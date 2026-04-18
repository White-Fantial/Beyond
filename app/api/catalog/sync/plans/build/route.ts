/**
 * POST /api/catalog/sync/plans/build — build a sync plan
 *
 * Body:
 *   { tenantId, storeId, connectionId, externalChangeId?, conflictId?, createdByUserId? }
 */

import { NextRequest, NextResponse } from "next/server";
import { buildSyncPlanForConnection } from "@/services/catalog-sync-planner.service";
import type { BuildSyncPlanInput } from "@/types/catalog-sync";

export async function POST(req: NextRequest) {
  let body: BuildSyncPlanInput;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { tenantId, storeId, connectionId } = body;
  if (!tenantId || !storeId || !connectionId) {
    return NextResponse.json(
      { error: "tenantId, storeId, connectionId are required" },
      { status: 400 }
    );
  }

  const plan = await buildSyncPlanForConnection(body);
  return NextResponse.json({ plan }, { status: 201 });
}
