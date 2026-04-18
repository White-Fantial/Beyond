/**
 * GET /api/catalog/sync/inbox — sync inbox summary + open items for a connection
 *
 * Query params: connectionId
 */

import { NextRequest, NextResponse } from "next/server";
import { getSyncInboxSummary } from "@/services/catalog-sync-executor.service";
import { previewSyncPlan } from "@/services/catalog-sync-planner.service";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const connectionId = searchParams.get("connectionId");
  if (!connectionId) {
    return NextResponse.json({ error: "connectionId is required" }, { status: 400 });
  }

  const summary = await getSyncInboxSummary(connectionId);

  let preview = null;
  if (summary.activePlanId) {
    preview = await previewSyncPlan(summary.activePlanId);
  }

  // Open external changes for display
  const openChanges = await prisma.externalCatalogChange.findMany({
    where: { connectionId, status: { in: ["OPEN", "PENDING"] } },
    orderBy: { detectedAt: "desc" },
    take: 20,
  });

  return NextResponse.json({ summary, preview, openChanges });
}
